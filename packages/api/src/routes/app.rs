use crate::state::AppState;
use axum::{
    Router,
    routing::{get, put},
};

pub mod delete_app;
pub mod get_apps;
pub mod meta;
pub mod template;
pub mod upsert_app;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(get_apps::get_apps))
        .route(
            "/{app_id}",
            put(upsert_app::upsert_app).delete(delete_app::delete_app),
        )
        .nest("/template", template::routes())
}

#[macro_export]
macro_rules! ensure_permission {
    ($user:expr, $app_id:expr, $state:expr, $perm:expr) => {{
        let sub = $user.app_permission($app_id, $state).await?;
        if !sub.has_permission($perm) {
            return Err(crate::error::ApiError::Forbidden);
        }
        sub
    }};
}

#[macro_export]
macro_rules! ensure_permissions {
    ($user:expr, $app_id:expr, $state:expr, $perms:expr) => {{
        let sub = $user.app_permission($app_id, $state).await?;
        for perm in $perms.iter() {
            if !sub.has_permission(perm) {
                return Err(crate::error::ApiError::Forbidden);
            }
        }
        sub
    }};
}
