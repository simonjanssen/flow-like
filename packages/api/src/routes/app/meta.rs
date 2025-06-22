use axum::{Router, routing::get};

use crate::state::AppState;

pub mod get_media;
pub mod get_meta;
pub mod remove_media;
pub mod upload_media;
pub mod upsert_meta;

pub fn routes() -> Router<AppState> {
    Router::new().route("/", get(get_meta::get_meta).put(upsert_meta::upsert_meta))
}
