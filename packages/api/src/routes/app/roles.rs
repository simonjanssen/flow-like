use axum::{
    Router,
    routing::{get, put},
};

use crate::state::AppState;

pub mod delete_role;
pub mod get_roles;
pub mod make_role_default;
pub mod upsert_role;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(get_roles::get_roles))
        .route(
            "/{role_id}",
            put(upsert_role::upsert_role).delete(delete_role::delete_role),
        )
        .route(
            "/{role_id}/default",
            put(make_role_default::make_role_default),
        )
}
