use crate::state::AppState;
use axum::{Router, routing::get};
use info::user_info;

pub mod info;
pub mod lookup;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(|| async { "Hello, World!" }))
        .route("/info", get(user_info))
        .route("/lookup/{query}", get(lookup::user_lookup))
}
