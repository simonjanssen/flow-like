pub mod presign;

use axum::{Router, routing::get};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/presign", get(presign::presign))
}
