use axum::{
    Router,
    routing::{get, put},
};

use crate::state::AppState;

pub mod delete_template;
pub mod get_templates;
pub mod upsert_template;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(upsert_template::upsert_template))
        .route("/{template_id}", put(upsert_template::upsert_template))
}
