use axum::extract::State;
use axum::http::StatusCode;
use axum::response::Response;
use serde::Serialize;
use tokio_postgres::error::SqlState;

use crate::logging;
use crate::userdata::{GameData, UserInfo};
use crate::{error_response, ok_json, AppState};

pub type DbResult<T> = Result<T, Box<dyn std::error::Error + Send + Sync>>;

// Errors of creating an account, mirroring the ones the original server used
pub enum CreateUserError {
	InvalidInput,
	UsernameTaken,
	Other(Box<dyn std::error::Error + Send + Sync>),
}

// Errors of checking a login, mirroring the ones the original server used
pub enum AuthenticateError {
	InvalidInput,
	Other(Box<dyn std::error::Error + Send + Sync>),
}

const LOAD_ACTIVE_GAME_SQL: &str = "
	SELECT id, scores, dice, dice_locked, turn_count, roll_count
	FROM games g
	WHERE g.user_id = $1 AND g.status = 'in_progress';
";

const LOAD_FINISHED_GAME_SQL: &str = "
	SELECT id, scores, dice, dice_locked, turn_count, roll_count
	FROM games g
	WHERE g.user_id = $1 AND g.status = 'finished'
	ORDER BY g.finished_at DESC LIMIT 1;
";

const SAVE_GAME_SQL: &str = "
	INSERT INTO games (
		user_id,
		scores,
		dice,
		dice_locked,
		turn_count,
		roll_count
	)
	VALUES ($1, $2, $3, $4, $5, $6)
	ON CONFLICT (user_id) WHERE status = 'in_progress'
	DO UPDATE SET
		scores = EXCLUDED.scores,
		dice = EXCLUDED.dice,
		dice_locked = EXCLUDED.dice_locked,
		turn_count = EXCLUDED.turn_count,
		roll_count = EXCLUDED.roll_count
	RETURNING id;
";

// Creates an account for the given username and password and
// returns the id of the new user. New accounts are not allowed
// to play yet unless ALLOW_NEW_USERS is set.
pub async fn create_user(
	state: &AppState,
	username: &str,
	password: &str,
) -> Result<i64, CreateUserError> {
	let username = username.trim().to_string();

	if username.len() < 3 || username.len() > 32 {
		return Err(CreateUserError::InvalidInput);
	}

	if password.len() < 8 || password.len() > 72 {
		return Err(CreateUserError::InvalidInput);
	}

	// bcrypt only uses the first 72 bytes, the cost matches
	// the default cost of the original server
	let hash = bcrypt::hash(password, 10)
		.map_err(|err| CreateUserError::Other(Box::new(err)))?;

	let client = state
		.pool
		.get()
		.await
		.map_err(|err| CreateUserError::Other(Box::new(err)))?;

	let row = client
		.query_one(
			"INSERT INTO users (username, password_hash, allowed)
			VALUES ($1, $2, $3)
			RETURNING id",
			&[&username, &hash, &state.allow_new_users],
		)
		.await;

	match row {
		Ok(row) => Ok(row.get(0)),
		// 23505 = unique_violation
		Err(err) if err.code() == Some(&SqlState::UNIQUE_VIOLATION) => {
			Err(CreateUserError::UsernameTaken)
		}
		Err(err) => Err(CreateUserError::Other(Box::new(err))),
	}
}

// Looks up a user by username and checks the given password
// against the stored hash. Returns InvalidInput both when the
// user does not exist and when the password is wrong, so the
// caller cannot tell the two apart.
pub async fn authenticate_user(
	state: &AppState,
	username: &str,
	password: &str,
) -> Result<UserInfo, AuthenticateError> {
	let username = username.trim().to_string();

	let client = state
		.pool
		.get()
		.await
		.map_err(|err| AuthenticateError::Other(Box::new(err)))?;

	let row = client
		.query_opt(
			"SELECT id, username, password_hash, allowed
			FROM users
			WHERE lower(username) = lower($1)",
			&[&username],
		)
		.await
		.map_err(|err| AuthenticateError::Other(Box::new(err)))?;

	let Some(row) = row else {
		return Err(AuthenticateError::InvalidInput);
	};

	let hash: Option<String> = row.get(2);
	let Some(hash) = hash else {
		return Err(AuthenticateError::Other(Box::new(std::io::Error::other(
			"user has no password hash",
		))));
	};

	if !bcrypt::verify(password, &hash).unwrap_or(false) {
		return Err(AuthenticateError::InvalidInput);
	}

	Ok(UserInfo {
		id: row.get(0),
		username: row.get(1),
		allowed: row.get(3),
	})
}

// Adds a new ongoing game for the given user, or returns the
// existing one if the user already has a game in progress
pub async fn create_active_game(state: &AppState, user_id: i64) -> DbResult<GameData> {
	let client = state.pool.get().await?;
	let row = client
		.query_one(
			"INSERT INTO games (user_id)
			VALUES ($1)
			ON CONFLICT (user_id) WHERE status = 'in_progress'
			DO UPDATE SET user_id = EXCLUDED.user_id
			RETURNING id;",
			&[&user_id],
		)
		.await?;

	Ok(GameData {
		id: row.get(0),
		user_id,
		..GameData::default()
	})
}

// Load the ongoing game of the given user. Returns
// Ok(None) when the user has no game in progress.
// In the scores array a NULL value means the item has not
// been selected yet, so the scores with NULLs replaced by 0
// and the selected item flags are read from the same array.
pub async fn load_active_game(state: &AppState, user_id: i64) -> DbResult<Option<GameData>> {
	load_game(state, user_id, LOAD_ACTIVE_GAME_SQL).await
}

// Load the most recently finished game of the given user.
// Used to answer requests that happen right after the
// ongoing game has been finished.
pub async fn load_latest_finished_game(
	state: &AppState,
	user_id: i64,
) -> DbResult<Option<GameData>> {
	load_game(state, user_id, LOAD_FINISHED_GAME_SQL).await
}

async fn load_game(state: &AppState, user_id: i64, sql: &str) -> DbResult<Option<GameData>> {
	let client = state.pool.get().await?;
	let Some(row) = client.query_opt(sql, &[&user_id]).await? else {
		return Ok(None);
	};

	let scores: Vec<Option<i32>> = row.get(1);
	let dice_values: Vec<i32> = row.get(2);
	let dice_locked: Vec<bool> = row.get(3);

	let mut game = GameData {
		id: row.get(0),
		user_id,
		round_num: row.get(4),
		roll_count: row.get(5),
		..GameData::default()
	};

	for i in 0..15 {
		let score = scores.get(i).copied().flatten();
		game.scores[i] = score.unwrap_or(0);
		game.clicked[i] = score.is_some();
	}

	for i in 0..5 {
		game.dice[i].value = dice_values.get(i).copied().unwrap_or(0);
		game.dice[i].locked = dice_locked.get(i).copied().unwrap_or(false);
	}

	Ok(Some(game))
}

// Saves the state of the given user's ongoing game,
// or edits the existing one if there is one
pub async fn save_game(state: &AppState, game: &GameData) -> DbResult<i64> {
	// Items that have not been selected yet are stored as NULLs
	let scores: Vec<Option<i32>> = game
		.clicked
		.iter()
		.zip(game.scores.iter())
		.map(|(&clicked, &score)| if clicked { Some(score) } else { None })
		.collect();
	let dice_values: Vec<i32> = game.dice.iter().map(|die| die.value).collect();
	let dice_locked: Vec<bool> = game.dice.iter().map(|die| die.locked).collect();

	let client = state.pool.get().await?;
	let row = client
		.query_one(
			SAVE_GAME_SQL,
			&[
				&game.user_id,
				&scores,
				&dice_values,
				&dice_locked,
				&game.round_num,
				&game.roll_count,
			],
		)
		.await?;

	Ok(row.get(0))
}

// Sets the lock of a single dice of the ongoing game of the given
// user and returns the lock states of all five dice. Only that one
// dice is written, so a request for another dice that is being
// handled at the same time can not be overwritten with an older
// array. Returns Ok(None) when the user has no game in progress.
pub async fn set_dice_lock(
	state: &AppState,
	user_id: i64,
	dice: i32,
	locked: bool,
) -> DbResult<Option<[bool; 5]>> {
	// Arrays are one based in postgres, so the index used everywhere
	// else in the program is one smaller.
	let client = state.pool.get().await?;
	let row = client
		.query_opt(
			"UPDATE games
			SET dice_locked[$2::int] = $3::boolean
			WHERE user_id = $1 AND status = 'in_progress'
			RETURNING dice_locked;",
			&[&user_id, &(dice + 1), &locked],
		)
		.await?;

	Ok(row.map(|row| {
		let states: Vec<bool> = row.get(0);
		let mut result = [false; 5];
		for (i, state) in result.iter_mut().enumerate() {
			*state = states.get(i).copied().unwrap_or(false);
		}
		result
	}))
}

// Delete the ongoing game of the given user
pub async fn delete_active_game(state: &AppState, user_id: i64) -> DbResult<()> {
	let client = state.pool.get().await?;
	client
		.execute(
			"DELETE FROM games WHERE user_id = $1 AND status = 'in_progress';",
			&[&user_id],
		)
		.await?;
	Ok(())
}

// Marks the ongoing game of the given user as finished
// and stores its total score
pub async fn finish_game(state: &AppState, user_id: i64, total_score: i32) -> DbResult<()> {
	let client = state.pool.get().await?;
	client
		.execute(
			"UPDATE games
			SET status = 'finished', total_score = $2, finished_at = now()
			WHERE user_id = $1 AND status = 'in_progress';",
			&[&user_id, &total_score],
		)
		.await?;
	Ok(())
}

#[derive(Serialize)]
pub struct TopScore {
	pub name: String,
	pub score: i32,
}

#[derive(Serialize)]
pub struct UserStat {
	pub name: String,
	pub score: i32,
	pub count: i64,
}

// Get the 20 best finished games with the username of their player
pub async fn top_scores(State(state): State<AppState>) -> Response {
	let result = match fetch_top_scores(&state).await {
		Ok(result) => result,
		Err(err) => {
			logging::errout("Error in getting top scores");
			logging::errout(&err.to_string());
			return error_response(
				StatusCode::INTERNAL_SERVER_ERROR,
				"could not load top scores",
			);
		}
	};

	ok_json(serde_json::json!({ "success": true, "result": result }))
}

async fn fetch_top_scores(state: &AppState) -> DbResult<Vec<TopScore>> {
	let client = state.pool.get().await?;
	let rows = client
		.query(
			"SELECT u.username, g.total_score
			FROM games g
			JOIN users u ON u.id = g.user_id
			WHERE g.status = 'finished'
			ORDER BY g.total_score DESC
			LIMIT 20;",
			&[],
		)
		.await?;

	Ok(rows
		.iter()
		.map(|row| TopScore {
			name: row.get(0),
			score: row.get::<_, Option<i32>>(1).unwrap_or(0),
		})
		.collect())
}

// Get the username, best score and games played
// of every user that has finished games
pub async fn user_stats(State(state): State<AppState>) -> Response {
	let result = match fetch_user_stats(&state).await {
		Ok(result) => result,
		Err(err) => {
			logging::errout("Error getting stats grouped by user");
			logging::errout(&err.to_string());
			return error_response(
				StatusCode::INTERNAL_SERVER_ERROR,
				"could not load user stats",
			);
		}
	};

	ok_json(serde_json::json!({ "success": true, "result": result }))
}

async fn fetch_user_stats(state: &AppState) -> DbResult<Vec<UserStat>> {
	let client = state.pool.get().await?;
	let rows = client
		.query(
			"SELECT u.username, MAX(g.total_score), COUNT(*)
			FROM games g
			JOIN users u ON u.id = g.user_id
			WHERE g.status = 'finished'
			GROUP BY u.id, u.username
			ORDER BY MAX(g.total_score) DESC;",
			&[],
		)
		.await?;

	Ok(rows
		.iter()
		.map(|row| UserStat {
			name: row.get(0),
			score: row.get::<_, Option<i32>>(1).unwrap_or(0),
			count: row.get(2),
		})
		.collect())
}
