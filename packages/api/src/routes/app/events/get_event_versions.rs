use crate::{
    ensure_permission, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};

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

    let app = state.scoped_app(&sub, &app_id, &state).await?;
    let versions = app.get_event_versions(&event_id).await?;

    Ok(Json(versions))
}
