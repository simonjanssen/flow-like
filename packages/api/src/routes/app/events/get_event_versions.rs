use crate::{
    ensure_permission, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions,
    routes::app::template::get_template::VersionQuery, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use flow_like::flow::board::Board;
use flow_like_types::anyhow;

#[tracing::instrument(
    name = "GET /apps/{app_id}/events/{event_id}/versions",
    skip(state, user)
)]
pub async fn get_event_versions(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, event_id)): Path<(String, String)>,
) -> Result<Json<Vec<(u32, u32, u32)>>, ApiError> {
    let permission = ensure_permission!(user, &app_id, &state, RolePermissions::WriteEvents);
    let sub = permission.sub()?;

    let mut app = state.scoped_app(&sub, &app_id, &state).await?;
    let versions = app.get_event_versions(&event_id).await?;

    Ok(Json(versions))
}
