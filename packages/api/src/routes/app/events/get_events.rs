use crate::{
    ensure_permission, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like::flow::event::Event;

#[tracing::instrument(name = "GET /apps/{app_id}/events", skip(state, user))]
pub async fn get_events(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
) -> Result<Json<Vec<Event>>, ApiError> {
    let permission = ensure_permission!(user, &app_id, &state, RolePermissions::WriteEvents);
    let sub = permission.sub()?;

    let app = state.master_app(&sub, &app_id, &state).await?;
    let events = &app.events;
    let mut loaded_events = Vec::with_capacity(events.len());

    for event in events {
        if let Ok(loaded_event) = Event::load(event, &app, None).await {
            loaded_events.push(loaded_event);
        } else {
            tracing::warn!("Failed to load event: {} in app {}", event, app_id.clone());
        }
    }

    Ok(Json(loaded_events))
}
