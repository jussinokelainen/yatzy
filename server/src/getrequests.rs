use axum::extract::{Extension, State};
use axum::http::StatusCode;
use axum::response::Response;
use rand::Rng;
use serde::Serialize;

use crate::dbapi;
use crate::userdata::{UserInfo, calculate_total};
use crate::{AppState, error_response, ok_json};

#[derive(Serialize)]
struct StartResponse {
    success: bool,
    clickedarray: [bool; 15],
    scorearray: [i32; 15],
    dice: [i32; 5],
    locked: [bool; 5],
    roll_count: i32,
    total: i32,
    subtotal: i32,
}

// Function that checks whether the user of the request has
// an ongoing game they have already played at least one round of
pub async fn check_existing_progress(
    State(state): State<AppState>,
    Extension(user): Extension<UserInfo>,
) -> Response {
    let exists = matches!(
        dbapi::load_active_game(&state, user.id).await,
        Ok(Some(game)) if game.round_num > 0
    );

    ok_json(serde_json::json!({ "exists": exists }))
}

// Start a game for the user of the request, loads their ongoing
// game if they have one, otherwise a new empty game is created.
// The response contains the whole state of the game.
pub async fn start_game(
    State(state): State<AppState>,
    Extension(user): Extension<UserInfo>,
) -> Response {
    let current_game = match dbapi::load_active_game(&state, user.id).await {
        Ok(Some(game)) => game,
        _ => {
            // No game in progress, start a new one
            match dbapi::create_active_game(&state, user.id).await {
                Ok(game) => game,
                Err(_) => {
                    return error_response(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "could not start a game",
                    );
                }
            }
        }
    };

    let mut values = [0; 5];
    let mut locked = [false; 5];
    for (i, die) in current_game.dice.iter().enumerate() {
        values[i] = die.value;
        locked[i] = die.locked;
    }

    let (total, sub_total) = calculate_total(&current_game);

    ok_json(&StartResponse {
        success: true,
        clickedarray: current_game.clicked,
        scorearray: current_game.scores,
        dice: values,
        locked,
        roll_count: current_game.roll_count,
        total,
        subtotal: sub_total,
    })
}

// Rolls the dice for the user of the request, returns them to the caller as JSON
pub async fn roll_dice(
    State(state): State<AppState>,
    Extension(user): Extension<UserInfo>,
) -> Response {
    let Ok(Some(mut current_game)) = dbapi::load_active_game(&state, user.id).await else {
        return error_response(StatusCode::NOT_FOUND, "no game in progress");
    };

    // Generate new values for all unlocked dice
    let mut values = [0; 5];
    for (i, die) in current_game.dice.iter_mut().enumerate() {
        if !die.locked {
            die.value = rand::rng().random_range(1..=6);
        }
        values[i] = die.value;
    }

    current_game.roll_count += 1;

    // Update database to have current dice values,
    // and return them as the response to the http request
    if dbapi::save_game(&state, &current_game).await.is_err() {
        return error_response(StatusCode::INTERNAL_SERVER_ERROR, "could not save game");
    }

    ok_json(serde_json::json!({
        "success": true,
        "values": values,
    }))
}

// Loads data of the ongoing game and returns it as the http response.
// Falls back to the most recently finished game, so the final score
// can still be read after the game has ended.
pub async fn get_game_stats(
    State(state): State<AppState>,
    Extension(user): Extension<UserInfo>,
) -> Response {
    let current_game = match dbapi::load_active_game(&state, user.id).await {
        Ok(Some(game)) => Some(game),
        Ok(None) => match dbapi::load_latest_finished_game(&state, user.id).await {
            Ok(game) => game,
            Err(_) => None,
        },
        Err(_) => None,
    };

    let Some(current_game) = current_game else {
        return error_response(StatusCode::NOT_FOUND, "no game found");
    };

    let (total, sub_total) = calculate_total(&current_game);

    ok_json(serde_json::json!({
        "success": true,
        "scorearray": current_game.scores,
        "total": total,
        "subtotal": sub_total,
    }))
}
