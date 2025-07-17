use crate::{
    ensure_permission, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};

#[tracing::instrument(name = "DELETE /apps/{app_id}/board/{board_id}", skip(state, user))]
pub async fn delete_board(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, board_id)): Path<(String, String)>,
) -> Result<Json<()>, ApiError> {
    let permission = ensure_permission!(user, &app_id, &state, RolePermissions::WriteBoards);
    let sub = permission.sub()?;

    let mut app = state.scoped_app(&sub, &app_id, &state).await?;
    app.delete_board(&board_id).await?;
    app.save().await?;

    Ok(Json(()))
}
