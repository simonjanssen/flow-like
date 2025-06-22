use crate::{
    ensure_permission, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like::flow::{board::ExecutionStage, execution::LogLevel};
use serde::Deserialize;

#[derive(Clone, Deserialize)]
pub struct UpsertBoard {
    pub name: Option<String>,
    pub description: Option<String>,
    pub stage: Option<ExecutionStage>,
    pub log_level: Option<LogLevel>,
}

#[tracing::instrument(
    name = "PUT /apps/{app_id}/board/{board_id}",
    skip(state, user, params)
)]
pub async fn upsert_board(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, board_id)): Path<(String, String)>,
    Json(params): Json<UpsertBoard>,
) -> Result<Json<()>, ApiError> {
    let permission = ensure_permission!(user, &app_id, &state, RolePermissions::WriteBoards);
    let sub = permission.sub()?;

    let mut app = state.scoped_app(&sub, &app_id, &state).await?;
    let mut id = board_id.clone();
    if !app.boards.contains(&board_id) {
        id = app.create_board(None).await?;
    }

    let board = app.open_board(id, Some(false), None).await?;
    let mut board = board.lock().await;
    board.name = params.name.unwrap_or(board.name.clone());
    board.description = params.description.unwrap_or(board.description.clone());
    board.stage = params.stage.unwrap_or(board.stage.clone());
    board.log_level = params.log_level.unwrap_or(board.log_level);
    board.save(None).await?;

    Ok(Json(()))
}
