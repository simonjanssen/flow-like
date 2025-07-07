use std::sync::Arc;

use crate::{
    ensure_permission, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like::flow::board::commands::GenericCommand;
use flow_like_types::sync::Mutex;
use serde::Deserialize;

#[derive(Clone, Deserialize)]
pub struct ExecuteCommandsBody {
    pub commands: Vec<GenericCommand>,
}

#[tracing::instrument(
    name = "POST /apps/{app_id}/board/{board_id}",
    skip(state, user, params)
)]
pub async fn execute_commands(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, board_id)): Path<(String, String)>,
    Json(params): Json<ExecuteCommandsBody>,
) -> Result<Json<Vec<GenericCommand>>, ApiError> {
    let permission = {
        let span = tracing::info_span!("ensure_permission");
        span.in_scope(|| tracing::info!("Ensuring permission"));
        let permission: crate::middleware::jwt::AppPermissionResponse = ensure_permission!(user, &app_id, &state, RolePermissions::WriteBoards);

        span.in_scope(|| tracing::info!("Permission ensured"));
        permission
    };

    let sub = {
        let span = tracing::info_span!("permission.sub");
        span.in_scope(|| tracing::info!("Getting sub"));
        let sub = permission.sub()?;
        span.in_scope(|| tracing::info!("Got sub: {:?}", sub));
        sub
    };

    tracing::info!("Loading board...");
    let mut board = state
        .scoped_board(&sub, &app_id, &board_id, &state, None)
        .await?;
    tracing::info!("Board loaded");

    let flow_state = {
        let span = tracing::info_span!("get_or_create_flow_state");
        if let Some(flow_state) = &board.app_state {
            span.in_scope(|| tracing::info!("Using existing flow_state"));
            flow_state.clone()
        } else {
            span.in_scope(|| tracing::info!("No flow_state, creating new"));
            tracing::info!("Loading scoped credentials...");
            let flow_state = state
                .scoped_credentials(&sub, &app_id)
                .await?
                .to_state(state)
                .await?;
            tracing::info!("Created new flow_state");
            Arc::new(Mutex::new(flow_state))
        }
    };

    tracing::info!("Executing commands...");
    let commands = board.execute_commands(params.commands, flow_state).await?;
    tracing::info!("Commands executed");

    tracing::info!("Saving board...");
    board.save(None).await?;
    tracing::info!("Board saved");

    Ok(Json(commands))
}