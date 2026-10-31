mod auth;
mod dbapi;
mod getrequests;
mod itemscores;
mod logging;
mod postrequests;
mod userdata;

use std::convert::Infallible;
use std::net::SocketAddr;

use axum::Router;
use axum::extract::Request;
use axum::http::{Method, StatusCode};
use axum::middleware;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use serde::Serialize;
use tower::util::ServiceExt;
use tower_http::catch_panic::CatchPanicLayer;
use tower_http::compression::CompressionLayer;
use tower_http::services::{ServeDir, ServeFile};

// Amount of rounds after which a game is over
pub const MAX_ROUND: i32 = 15;

// State that the request handlers and middlewares need
#[derive(Clone)]
pub struct AppState {
    pub pool: deadpool_postgres::Pool,
    pub allow_new_users: bool,
}

#[tokio::main]
async fn main() {
    // Loads the .env file of the current directory when there is one
    let _ = dotenvy::dotenv();

    logging::setup();

    let state = AppState {
        pool: database_pool(),
        allow_new_users: env_flag("ALLOW_NEW_USERS"),
    };

    let app = router(state);

    logging::info("Server running...");

    let listener = tokio::net::TcpListener::bind("0.0.0.0:2222")
        .await
        .unwrap_or_else(|err| panic!("could not listen on port 2222: {}", err));

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap_or_else(|err| panic!("server error: {}", err));
}

// Same values the original server accepted for a flag
fn env_flag(name: &str) -> bool {
    matches!(
        std::env::var(name).unwrap_or_default().as_str(),
        "1" | "t" | "T" | "TRUE" | "true" | "True"
    )
}

// Connects to the database the connection details of which
// are given in the environment
fn database_pool() -> deadpool_postgres::Pool {
    let user = std::env::var("DATABASE_USER").unwrap_or_default();
    let password = std::env::var("DATABASE_PASSWORD").unwrap_or_default();
    let dbname = std::env::var("DATABASE_NAME").unwrap_or_default();

    let config: tokio_postgres::Config = format!(
        "host=db port=5432 user={} password={} dbname={} sslmode=disable",
        user, password, dbname
    )
    .parse()
    .unwrap_or_else(|err| panic!("invalid database configuration: {}", err));

    let manager = deadpool_postgres::Manager::from_config(
        config,
        tokio_postgres::NoTls,
        deadpool_postgres::ManagerConfig {
            recycling_method: deadpool_postgres::RecyclingMethod::Fast,
        },
    );

    deadpool_postgres::Pool::builder(manager)
        .build()
        .unwrap_or_else(|err| panic!("could not create the database pool: {}", err))
}

fn router(state: AppState) -> Router {
    // Public routes, they work without a login
    let api = Router::new()
        .route("/register", post(auth::register))
        .route("/login", post(auth::login))
        .route("/logout", post(auth::logout))
        .route("/me", get(auth::me))
        // Leaderboards
        .route("/leaderboard/topscores", get(dbapi::top_scores))
        .route("/leaderboard/userstats", get(dbapi::user_stats));

    // Routes that belong to a single player
    let game = Router::new()
        // POST requests
        .route("/restart", post(postrequests::restart_game))
        .route("/lockdice/{dice}", post(postrequests::lock_dice))
        .route("/selectitem/{what}", post(postrequests::select_item))
        // GET requests
        .route(
            "/checkexistingprogress",
            get(getrequests::check_existing_progress),
        )
        .route("/start", get(getrequests::start_game))
        .route("/rolldice", get(getrequests::roll_dice))
        .route("/getgamestats", get(getrequests::get_game_stats))
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            auth::require_session,
        ));

    // Files of the frontend build
    let serve_dir =
        ServeDir::new("web/dist").fallback(tower::service_fn(|request: Request| async move {
            Ok::<_, Infallible>(page(request).await)
        }));
    // ServeDir only answers page requests itself, everything else is
    // handed to the frontend fallback, which turns it into the same
    // answer the original server gave
    let static_files = tower::service_fn(move |request: Request| {
        let serve_dir = serve_dir.clone();
        async move {
            let is_page = request.method() == Method::GET || request.method() == Method::HEAD;
            let response = if is_page {
                serve_dir
                    .oneshot(request)
                    .await
                    .unwrap_or_else(|_| unreachable!())
                    .map(axum::body::Body::new)
            } else {
                page(request).await
            };
            Ok::<_, Infallible>(response)
        }
    });

    Router::new()
        .nest("/api", api)
        .nest("/gameapi", game)
        .fallback_service(static_files)
        .layer(CatchPanicLayer::new())
        .layer(middleware::from_fn(logging::log_request))
        .layer(CompressionLayer::new())
        .with_state(state)
}

// Everything that is not an api route or a file in web/dist is
// handled by the frontend itself, which reads the url and shows
// the matching screen (for example /login or /game). Without this
// opening those urls directly would answer with a 404.
async fn page(request: Request) -> Response {
    let is_api = {
        let path = request.uri().path();
        path == "/api" || path.starts_with("/api/")
    };
    let is_page = request.method() == Method::GET || request.method() == Method::HEAD;

    // Requests that were meant for the api stay plain 404s,
    // and other methods than GET have no page to serve
    if is_api || !is_page {
        return error_response(StatusCode::NOT_FOUND, "not found");
    }

    // index.html names the hashed files of this exact build, so a
    // cached copy would keep pointing at files a later build removed
    let mut response = match ServeFile::new("web/dist/index.html").oneshot(request).await {
        Ok(response) => response.map(axum::body::Body::new),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    response.headers_mut().insert(
        axum::http::header::CACHE_CONTROL,
        axum::http::HeaderValue::from_static("no-cache"),
    );

    response
}

// Helper for replying with an error the same way the original server did
pub fn error_response(status: StatusCode, message: &str) -> Response {
    (status, axum::Json(serde_json::json!({ "error": message }))).into_response()
}

// Helper for replying with a successful json response
pub fn ok_json<T: Serialize>(value: T) -> Response {
    (StatusCode::OK, axum::Json(value)).into_response()
}
