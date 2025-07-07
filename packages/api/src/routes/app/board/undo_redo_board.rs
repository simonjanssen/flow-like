use std::sync::Arc;

use crate::{
    ensure_permission, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions,
    routes::app::template::get_template::VersionQuery, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use flow_like::flow::board::{Board, commands::GenericCommand};
use flow_like_types::{anyhow, sync::Mutex};
use serde::Deserialize;

#[derive(Clone, Deserialize)]
pub struct ExecuteCommandsBody {
    pub commands: Vec<GenericCommand>,
}

#[tracing::instrument(
    name = "PATCH /apps/{app_id}/board/{board_id}/undo",
    skip(state, user, params)
)]
pub async fn undo_board(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, board_id)): Path<(String, String)>,
    Json(params): Json<ExecuteCommandsBody>,
) -> Result<Json<()>, ApiError> {
    let permission = ensure_permission!(user, &app_id, &state, RolePermissions::WriteBoards);
    let sub = permission.sub()?;

    let flow_state = state
        .scoped_credentials(&sub, &app_id)
        .await?
        .to_state(state.clone())
        .await?;

    let mut board = state
        .scoped_board(&sub, &app_id, &board_id, &state, None)
        .await?;

    board
        .undo(params.commands, Arc::new(Mutex::new(flow_state)))
        .await?;
    board.save(None).await?;

    Ok(Json(()))
}

#[tracing::instrument(
    name = "PATCH /apps/{app_id}/board/{board_id}/redo",
    skip(state, user, params)
)]
pub async fn redo_board(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, board_id)): Path<(String, String)>,
    Json(params): Json<ExecuteCommandsBody>,
) -> Result<Json<()>, ApiError> {
    let permission = ensure_permission!(user, &app_id, &state, RolePermissions::WriteBoards);
    let sub = permission.sub()?;

    let flow_state = state
        .scoped_credentials(&sub, &app_id)
        .await?
        .to_state(state.clone())
        .await?;

    let mut board = state
        .scoped_board(&sub, &app_id, &board_id, &state, None)
        .await?;

    board
        .undo(params.commands, Arc::new(Mutex::new(flow_state)))
        .await?;
    board.save(None).await?;

    Ok(Json(()))
}
