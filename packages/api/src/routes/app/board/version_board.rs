use crate::{
    ensure_permission, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use flow_like::flow::board::VersionType;
use serde::Deserialize;

#[derive(Clone, Deserialize)]
pub struct CreateVersionQuery {
    pub version_type: Option<VersionType>,
}

#[tracing::instrument(
    name = "PATCH /app/{app_id}/board/{board_id}",
    skip(state, user, params)
)]
pub async fn version_board(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, board_id)): Path<(String, String)>,
    Query(params): Query<CreateVersionQuery>,
) -> Result<Json<(u32, u32, u32)>, ApiError> {
    let permission = ensure_permission!(user, &app_id, &state, RolePermissions::WriteBoards);
    let sub = permission.sub()?;

    let mut board = state
        .scoped_board(&sub, &app_id, &board_id, &state, None)
        .await?;
    let version = board
        .create_version(params.version_type.unwrap_or(VersionType::Patch), None)
        .await?;

    Ok(Json(version))
}
