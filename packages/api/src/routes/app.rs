use axum::{
    Router,
    routing::{get, put},
};

use crate::state::AppState;

pub mod delete_app;
pub mod get_apps;
pub mod meta;
pub mod upsert_app;

pub fn routes() -> Router<AppState> {
    Router::new().route("/", get(get_apps::get_apps)).route(
        "/{app_id}",
        put(upsert_app::upsert_app).delete(delete_app::delete_app),
    )
}
