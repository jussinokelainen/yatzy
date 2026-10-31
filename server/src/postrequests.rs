use axum::body::Bytes;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::response::Response;
use serde::Deserialize;

use crate::dbapi;
use crate::itemscores::calculate_item;
use crate::logging;
use crate::userdata::{calculate_total, reset_dice, UserInfo};
use crate::{error_response, ok_json, AppState, MAX_ROUND};

// Request body of the lockdice route. A pointer like behaviour is
// wanted so that a missing value can be told apart from a request
// that explicitly wants the dice unlocked.
#[derive(Deserialize)]
struct LockRequest {
	#[serde(default)]
	locked: Option<bool>,
}

// Delete ongoing game data for the user of the request
pub async fn restart_game(
	State(state): State<AppState>,
	Extension(user): Extension<UserInfo>,
) -> Response {
	if let Err(err) = dbapi::delete_active_game(&state, user.id).await {
		logging::errout("Error deleting game");
		logging::errout(&err.to_string());
		return error_response(StatusCode::INTERNAL_SERVER_ERROR, "could not reset game");
	}

	ok_json(serde_json::json!({ "success": true }))
}

// Sets the lock of the dice given as path parameter for the user of the
// request to the value given in the request body. The lock is set
// instead of toggled so that sending the same request again, which
// happens when an answer is slow or lost and the player presses the
// button a second time, leaves the same state behind instead of
// flipping the dice once more. The state that was saved is returned
// so the client can show exactly what the server has.
pub async fn lock_dice(
	State(state): State<AppState>,
	Extension(user): Extension<UserInfo>,
	Path(dice): Path<String>,
	body: Bytes,
) -> Response {
	let Ok(dice) = dice.parse::<i32>() else {
		return error_response(StatusCode::BAD_REQUEST, "invalid dice index");
	};
	if !(0..5).contains(&dice) {
		return error_response(StatusCode::BAD_REQUEST, "No dice with that index");
	}

	let request: LockRequest = match serde_json::from_slice::<LockRequest>(&body) {
		Ok(request) if request.locked.is_some() => request,
		_ => return error_response(StatusCode::BAD_REQUEST, "missing lock state"),
	};

	let locked = match dbapi::set_dice_lock(&state, user.id, dice, request.locked.unwrap()).await {
		Ok(Some(locked)) => locked,
		Ok(None) => return error_response(StatusCode::NOT_FOUND, "no game in progress"),
		Err(err) => {
			logging::errout("Error saving dice lock");
			logging::errout(&err.to_string());
			return error_response(StatusCode::INTERNAL_SERVER_ERROR, "could not save game");
		}
	};

	ok_json(serde_json::json!({
		"success": true,
		"locked": locked,
	}))
}

// Saves the selected scoreboard item for the user of the request.
// The value of the item is calculated from the dice of their
// ongoing game. Selecting the last item also finishes the game.
pub async fn select_item(
	State(state): State<AppState>,
	Extension(user): Extension<UserInfo>,
	Path(what): Path<String>,
) -> Response {
	let Ok(Some(mut current_game)) = dbapi::load_active_game(&state, user.id).await else {
		return error_response(StatusCode::NOT_FOUND, "no game in progress");
	};

	// value that will be set to the calculated value
	let Some((val, item_int)) = calculate_item(&what, &current_game) else {
		return error_response(StatusCode::BAD_REQUEST, "no such scoreboard item");
	};

	// The item can only be selected once
	if current_game.clicked[item_int] {
		return error_response(StatusCode::BAD_REQUEST, "item already selected");
	}

	current_game.scores[item_int] = val;
	current_game.clicked[item_int] = true;
	current_game.round_num += 1;
	current_game.roll_count = 0;
	reset_dice(&mut current_game);

	if dbapi::save_game(&state, &current_game).await.is_err() {
		return error_response(StatusCode::INTERNAL_SERVER_ERROR, "could not save game");
	}

	let (total, sub_total) = calculate_total(&current_game);

	// Check if the game is over
	let game_over = current_game.round_num >= MAX_ROUND;
	if game_over {
		if let Err(err) = dbapi::finish_game(&state, user.id, total).await {
			logging::errout("Error finishing game");
			logging::errout(&err.to_string());
			return error_response(StatusCode::INTERNAL_SERVER_ERROR, "could not finish game");
		}
	}

	ok_json(serde_json::json!({
		"success": true,
		"score": val,
		"total": total,
		"subtotal": sub_total,
		"gameover": game_over,
		"roundnumber": current_game.round_num,
	}))
}
