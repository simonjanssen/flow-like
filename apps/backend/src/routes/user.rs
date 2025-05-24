use super::auth::auth_middleware;
use crate::state::AppState;
use axum::middleware;
use axum::{routing::get, Router};
use info::user_info;
use tower::ServiceBuilder;

pub mod info;
pub mod lookup;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(|| async { "Hello, World!" }))
        .route("/info", get(user_info))
        .route("/lookup/{query}", get(lookup::user_lookup))
}
