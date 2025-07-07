use crate::{
    ensure_permission, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use flow_like::flow::{
    board::{Board, VersionType},
    event::Event,
};
use flow_like_types::anyhow;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct EventUpsertBody {
    event: Event,
    version_type: Option<VersionType>,
}

#[tracing::instrument(
    name = "PUT /apps/{app_id}/events/{event_id}",
    skip(state, user, params)
)]
pub async fn upsert_event(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, event_id)): Path<(String, String)>,
    Json(params): Json<EventUpsertBody>,
) -> Result<Json<Event>, ApiError> {
    let permission = ensure_permission!(user, &app_id, &state, RolePermissions::WriteEvents);
    let sub = permission.sub()?;

    let mut event = params.event;
    event.id = event_id.clone();

    let mut app = state.scoped_app(&sub, &app_id, &state).await?;
    let event = app.upsert_event(event, params.version_type, None).await?;
    app.save().await?;

    Ok(Json(event))
}
