use std::fs::OpenOptions;
use std::io::Write;
use std::sync::{Mutex, OnceLock};
use std::time::Instant;

use axum::extract::{ConnectInfo, Request};
use axum::middleware::Next;
use axum::response::Response;
use chrono::Local;
use std::net::SocketAddr;

struct Logger {
	file: Mutex<std::fs::File>,
}

static LOGGER: OnceLock<Logger> = OnceLock::new();

// Opens the log file of this run in the logs directory. Every line that
// gets logged is written to the file and to stdout, like the original
// server did. Like there, a missing logs directory is a panic.
pub fn setup() {
	let time_now = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
	let log_file_name = format!("/logs/{}.log", time_now);
	let file = OpenOptions::new()
		.create(true)
		.write(true)
		.append(true)
		.open(&log_file_name)
		.unwrap_or_else(|err| panic!("could not open log file {}: {}", log_file_name, err));

	let _ = LOGGER.set(Logger {
		file: Mutex::new(file),
	});
}

// Writes a single line to stdout and the log file
pub fn raw(line: &str) {
	println!("{}", line);

	if let Some(logger) = LOGGER.get() {
		if let Ok(mut file) = logger.file.lock() {
			let _ = writeln!(file, "{}", line);
		}
	}
}

// Print helper functions matching the original server
#[allow(dead_code)]
pub fn ok(msg: &str) {
	tagged("\x1b[32m OK \x1b[0m", msg)
}

pub fn info(msg: &str) {
	tagged("\x1b[35m INFO \x1b[0m", msg)
}

pub fn errout(msg: &str) {
	tagged("\x1b[31m ERROR \x1b[0m", msg)
}

fn tagged(tag: &str, msg: &str) {
	raw(&format!(
		"{} [{}] {}",
		Local::now().format("%Y/%m/%d %H:%M:%S"),
		tag,
		msg
	));
}

// Middleware that writes one line per request to the log, in the
// same style the original server used
pub async fn log_request(request: Request, next: Next) -> Response {
	let start = Instant::now();
	let method = request.method().clone();
	let path = request.uri().path().to_string();
	let ip = client_ip(&request);

	let response = next.run(request).await;

	let status = response.status().as_u16();
	raw(&format!(
		"[GIN] {} | {} | {:>13} | {:>15} | {} \"{}\"",
		Local::now().format("%Y/%m/%d"),
		colored_status(status),
		format!("{:?}", start.elapsed()),
		ip,
		method,
		path
	));

	response
}

// The address the request came from, preferring what a proxy in front
// of the server reports, like the original server did
fn client_ip(request: &Request) -> String {
	for name in ["x-forwarded-for", "x-real-ip"] {
		if let Some(value) = request.headers().get(name).and_then(|v| v.to_str().ok()) {
			let first = value.split(',').next().unwrap_or("").trim();
			if !first.is_empty() {
				return first.to_string();
			}
		}
	}

	if let Some(connect_info) = request.extensions().get::<ConnectInfo<SocketAddr>>() {
		return connect_info.0.ip().to_string();
	}

	"unknown".to_string()
}

fn colored_status(status: u16) -> String {
	let color = match status {
		200..=299 => "\x1b[32m",
		300..=399 => "\x1b[36m",
		400..=499 => "\x1b[33m",
		_ => "\x1b[31m",
	};

	format!("{}{:>3}\x1b[0m", color, status)
}
