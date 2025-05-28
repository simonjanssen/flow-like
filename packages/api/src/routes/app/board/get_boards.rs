use crate::{
    ensure_permission, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};

#[tracing::instrument(name = "GET /app/{app_id}/board", skip(state, user))]
pub async fn get_boards(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
) -> Result<Json<Vec<String>>, ApiError> {
    let permission = ensure_permission!(user, &app_id, &state, RolePermissions::ReadBoards);
    let sub = permission.sub()?;

    let app = state.scoped_app(&sub, &app_id, &state).await?;
    let boards = app.boards;

    Ok(Json(boards))
}
