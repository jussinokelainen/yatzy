use axum::body::Bytes;
use axum::extract::{Request, State};
use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::Json;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::RngCore;
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::error::Error;

use crate::dbapi::{self, AuthenticateError, CreateUserError, DbResult};
use crate::logging;
use crate::userdata::UserInfo;
use crate::{error_response, AppState};

// Name of the cookie that holds the session token
const SESSION_COOKIE_NAME: &str = "yatzy_session";
// How long a session stays valid: 30 days in seconds
const SESSION_DURATION: i64 = 30 * 24 * 60 * 60;

// Errors of loading a session
pub enum SessionError {
	NotFound,
	Other(Box<dyn Error + Send + Sync>),
}

// Request body shared by the login and register handlers
#[derive(Deserialize, Default)]
#[serde(default)]
pub struct AuthRequest {
	pub username: String,
	pub password: String,
}

// Response shared by the login and register handlers
#[derive(Serialize)]
pub struct AuthResponse {
	pub success: bool,
	pub username: String,
	pub allowed: bool,
}

// Returns true when the cookie should only be sent over https.
// The COOKIE_SECURE environment variable overrides the detection, with
// "true" always enabling it and "false" always disabling it. When the
// variable is not set, it is detected from the request, so the cookie
// works both when the server is served over https and when it is used
// over plain http in a local network.
fn cookie_secure(headers: &HeaderMap) -> bool {
	match std::env::var("COOKIE_SECURE").unwrap_or_default().to_lowercase() {
		secure if secure == "true" => return true,
		secure if secure == "false" => return false,
		_ => {}
	}

	// A proxy in front of the server terminated the https connection.
	// The connection to the server itself is never encrypted.
	headers
		.get("x-forwarded-proto")
		.and_then(|value| value.to_str().ok())
		.is_some_and(|value| value.eq_ignore_ascii_case("https"))
}

// Generates a random session token to use as a login credential.
// Only the hash of the token gets stored, so a leaked database
// does not leak usable session tokens.
fn new_session_token() -> String {
	let mut buf = [0u8; 32];
	rand::rng().fill_bytes(&mut buf);
	URL_SAFE_NO_PAD.encode(buf)
}

fn hash_token(token: &str) -> Vec<u8> {
	Sha256::digest(token.as_bytes()).to_vec()
}

// Cheap sanity check for the token read from a cookie,
// the real check happens against the database
fn looks_like_session_token(token: &str) -> bool {
	(20..=128).contains(&token.len())
}

// Reads the session token out of the cookie header of a request
fn session_token(headers: &HeaderMap) -> Option<String> {
	for value in headers.get_all(header::COOKIE) {
		let Ok(value) = value.to_str() else {
			continue;
		};

		for pair in value.split(';') {
			if let Some((name, token)) = pair.trim().split_once('=') {
				if name.trim() == SESSION_COOKIE_NAME {
					return Some(token.trim().to_string());
				}
			}
		}
	}

	None
}

// Builds the Set-Cookie value that hands the session token to the browser
fn session_cookie(token: &str, secure: bool) -> String {
	let expires = (Utc::now() + Duration::seconds(SESSION_DURATION))
		.format("%a, %d %b %Y %H:%M:%S GMT")
		.to_string();

	let mut value = format!(
		"{}={}; Path=/; Max-Age={}; Expires={}; HttpOnly; SameSite=Lax",
		SESSION_COOKIE_NAME, token, SESSION_DURATION, expires
	);
	if secure {
		value.push_str("; Secure");
	}

	value
}

// Builds the Set-Cookie value that removes the cookie from the browser
fn cleared_session_cookie(secure: bool) -> String {
	let mut value = format!(
		"{}=; Path=/; Max-Age=-1; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
		SESSION_COOKIE_NAME
	);
	if secure {
		value.push_str("; Secure");
	}

	value
}

fn append_cookie(response: &mut Response, value: String) {
	if let Ok(value) = HeaderValue::from_str(&value) {
		response.headers_mut().append(header::SET_COOKIE, value);
	}
}

// Creates a new session for the given user and
// returns the token to give to the browser
async fn create_session(state: &AppState, user_id: i64) -> Result<String, Box<dyn Error + Send + Sync>> {
	let token = new_session_token();
	let hash = hash_token(&token);

	let client = state.pool.get().await?;
	client
		.execute(
			"INSERT INTO sessions (token_hash, user_id, expires_at)
			VALUES ($1, $2, now() + $3::integer * interval '1 second')",
			&[&hash, &user_id, &(SESSION_DURATION as i32)],
		)
		.await?;

	Ok(token)
}

// Loads the user the given session token belongs to.
// Expired sessions are removed and reported as not found.
async fn get_session_user(state: &AppState, token: &str) -> Result<UserInfo, SessionError> {
	let hash = hash_token(token);

	let client = state
		.pool
		.get()
		.await
		.map_err(|err| SessionError::Other(Box::new(err)))?;

	let row = client
		.query_opt(
			"SELECT u.id, u.username, u.allowed, s.expires_at
			FROM sessions s
			JOIN users u ON u.id = s.user_id
			WHERE s.token_hash = $1",
			&[&hash],
		)
		.await
		.map_err(|err| SessionError::Other(Box::new(err)))?;

	let Some(row) = row else {
		return Err(SessionError::NotFound);
	};

	let expires_at: chrono::DateTime<Utc> = row.get(3);
	if Utc::now() > expires_at {
		let _ = delete_session(state, token).await;
		return Err(SessionError::NotFound);
	}

	// Keep track of when the session was last used
	let _ = client
		.execute(
			"UPDATE sessions SET last_used_at = now() WHERE token_hash = $1",
			&[&hash],
		)
		.await;

	Ok(UserInfo {
		id: row.get(0),
		username: row.get(1),
		allowed: row.get(2),
	})
}

// Removes the session belonging to the given token
async fn delete_session(state: &AppState, token: &str) -> DbResult<()> {
	let hash = hash_token(token);
	let client = state.pool.get().await?;
	client
		.execute("DELETE FROM sessions WHERE token_hash = $1", &[&hash])
		.await?;
	Ok(())
}

// Middleware that makes sure the request comes from a logged in user
// whose account is allowed to play. The user is read from the session
// cookie, and requests without a valid session get rejected with a 401.
pub async fn require_session(
	State(state): State<AppState>,
	mut request: Request,
	next: Next,
) -> Response {
	let secure = cookie_secure(request.headers());

	let Some(token) = session_token(request.headers()) else {
		return error_response(StatusCode::UNAUTHORIZED, "not logged in");
	};
	if !looks_like_session_token(&token) {
		return error_response(StatusCode::UNAUTHORIZED, "not logged in");
	}

	let user = match get_session_user(&state, &token).await {
		Ok(user) => user,
		Err(SessionError::NotFound) => {
			let mut response = error_response(StatusCode::UNAUTHORIZED, "session expired");
			append_cookie(&mut response, cleared_session_cookie(secure));
			return response;
		}
		Err(SessionError::Other(err)) => {
			logging::errout("Error loading session");
			logging::errout(&err.to_string());
			let mut response = error_response(StatusCode::UNAUTHORIZED, "session expired");
			append_cookie(&mut response, cleared_session_cookie(secure));
			return response;
		}
	};

	// Accounts that have not been allowed yet can not play
	if !user.allowed {
		return error_response(StatusCode::FORBIDDEN, "account not allowed");
	}

	request.extensions_mut().insert(user);
	next.run(request).await
}

// Creates an account for the given username and password and
// logs the new user in. New accounts are not allowed to play yet.
pub async fn register(
	State(state): State<AppState>,
	headers: HeaderMap,
	body: Bytes,
) -> Response {
	let request: AuthRequest = match serde_json::from_slice(&body) {
		Ok(request) => request,
		Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid request"),
	};

	let id = match dbapi::create_user(&state, &request.username, &request.password).await {
		Ok(id) => id,
		Err(CreateUserError::UsernameTaken) => {
			return error_response(StatusCode::CONFLICT, "username already taken");
		}
		Err(CreateUserError::InvalidInput) => {
			return error_response(
				StatusCode::BAD_REQUEST,
				"username must be 3-32 characters and password 8-72 characters long",
			);
		}
		Err(CreateUserError::Other(err)) => {
			logging::errout("Error creating user");
			logging::errout(&err.to_string());
			return error_response(
				StatusCode::INTERNAL_SERVER_ERROR,
				"could not create account",
			);
		}
	};

	let token = match create_session(&state, id).await {
		Ok(token) => token,
		Err(err) => {
			logging::errout("Error creating session");
			logging::errout(&err.to_string());
			return error_response(StatusCode::INTERNAL_SERVER_ERROR, "could not create session");
		}
	};

	let mut response = (
		StatusCode::OK,
		Json(AuthResponse {
			success: true,
			username: request.username.trim().to_string(),
			allowed: false,
		}),
	)
		.into_response();
	append_cookie(&mut response, session_cookie(&token, cookie_secure(&headers)));
	response
}

// Logs the user in by checking the given password against
// the stored hash and creating a new session for them
pub async fn login(State(state): State<AppState>, headers: HeaderMap, body: Bytes) -> Response {
	let request: AuthRequest = match serde_json::from_slice(&body) {
		Ok(request) => request,
		Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid request"),
	};

	let user = match dbapi::authenticate_user(&state, &request.username, &request.password).await {
		Ok(user) => user,
		Err(AuthenticateError::InvalidInput) => {
			return error_response(StatusCode::UNAUTHORIZED, "invalid username or password");
		}
		Err(AuthenticateError::Other(err)) => {
			logging::errout("Error authenticating user");
			logging::errout(&err.to_string());
			return error_response(StatusCode::INTERNAL_SERVER_ERROR, "could not log in");
		}
	};

	let token = match create_session(&state, user.id).await {
		Ok(token) => token,
		Err(err) => {
			logging::errout("Error creating session");
			logging::errout(&err.to_string());
			return error_response(StatusCode::INTERNAL_SERVER_ERROR, "could not create session");
		}
	};

	let mut response = (
		StatusCode::OK,
		Json(AuthResponse {
			success: true,
			username: user.username,
			allowed: user.allowed,
		}),
	)
		.into_response();
	append_cookie(&mut response, session_cookie(&token, cookie_secure(&headers)));
	response
}

// Logs the user out by removing their session
pub async fn logout(State(state): State<AppState>, headers: HeaderMap) -> Response {
	if let Some(token) = session_token(&headers) {
		if looks_like_session_token(&token) {
			if let Err(err) = delete_session(&state, &token).await {
				logging::errout("Error deleting session");
				logging::errout(&err.to_string());
			}
		}
	}

	let mut response = (StatusCode::OK, Json(serde_json::json!({ "success": true }))).into_response();
	append_cookie(
		&mut response,
		cleared_session_cookie(cookie_secure(&headers)),
	);
	response
}

// Returns the logged in user of the request, if any.
// Unlike the game routes this never rejects the request,
// the frontend uses it to decide whether to show the
// login screen or the game.
pub async fn me(State(state): State<AppState>, headers: HeaderMap) -> Response {
	let not_logged_in = || Json(serde_json::json!({ "logged_in": false }));

	let Some(token) = session_token(&headers) else {
		return not_logged_in().into_response();
	};
	if !looks_like_session_token(&token) {
		return not_logged_in().into_response();
	}

	let user = match get_session_user(&state, &token).await {
		Ok(user) => user,
		Err(_) => return not_logged_in().into_response(),
	};

	(
		StatusCode::OK,
		Json(serde_json::json!({
			"logged_in": true,
			"username": user.username,
			"allowed": user.allowed,
		})),
	)
		.into_response()
}
