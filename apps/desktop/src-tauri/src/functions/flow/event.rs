use flow_like::{
    app::App,
    flow::{board::VersionType, event::Event},
};
use tauri::AppHandle;

use crate::{functions::TauriFunctionError, state::TauriFlowLikeState};

#[tauri::command(async)]
pub async fn get_event(
    handler: AppHandle,
    app_id: String,
    event_id: String,
    version: Option<(u32, u32, u32)>,
) -> Result<Event, TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&handler).await?;

    if let Ok(app) = App::load(app_id, flow_like_state).await {
        let event = app.get_event(&event_id, version).await?;
        return Ok(event);
    }

    Err(TauriFunctionError::new("Event not found"))
}

#[tauri::command(async)]
pub async fn get_event_versions(
    handler: AppHandle,
    app_id: String,
    event_id: String,
) -> Result<Vec<(u32, u32, u32)>, TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&handler).await?;

    if let Ok(app) = App::load(app_id, flow_like_state).await {
        let versions = app.get_event_versions(&event_id).await?;
        return Ok(versions);
    }

    Err(TauriFunctionError::new("Event not found"))
}

#[tauri::command(async)]
pub async fn get_events(
    handler: AppHandle,
    app_id: String,
) -> Result<Vec<Event>, TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&handler).await?;

    if let Ok(app) = App::load(app_id.clone(), flow_like_state).await {
        let events = &app.events;
        let mut loaded_events = Vec::with_capacity(events.len());

        for event in events {
            if let Ok(loaded_event) = Event::load(event, &app, None).await {
                loaded_events.push(loaded_event);
            } else {
                tracing::warn!("Failed to load event: {} in app {}", event, app_id.clone());
            }
        }

        return Ok(loaded_events);
    }

    Err(TauriFunctionError::new("Events not found"))
}

#[tauri::command(async)]
pub async fn upsert_event(
    handler: AppHandle,
    app_id: String,
    event: Event,
    version_type: Option<VersionType>,
    enforce_id: Option<bool>,
) -> Result<Event, TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&handler).await?;

    if let Ok(mut app) = App::load(app_id.clone(), flow_like_state).await {
        let event = app.upsert_event(event, version_type, enforce_id).await?;
        return Ok(event);
    }

    Err(TauriFunctionError::new("Failed to upsert event"))
}

#[tauri::command(async)]
pub async fn delete_event(
    handler: AppHandle,
    app_id: String,
    event_id: String,
) -> Result<(), TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&handler).await?;

    if let Ok(mut app) = App::load(app_id.clone(), flow_like_state).await {
        app.delete_event(&event_id).await?;
        return Ok(());
    }

    Err(TauriFunctionError::new("Failed to delete event"))
}

#[tauri::command(async)]
pub async fn validate_event(
    handler: AppHandle,
    app_id: String,
    event_id: String,
    version: Option<(u32, u32, u32)>,
) -> Result<(), TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&handler).await?;

    if let Ok(app) = App::load(app_id.clone(), flow_like_state).await {
        app.validate_event(&event_id, version).await?;
        return Ok(());
    }

    Err(TauriFunctionError::new("Failed to validate event"))
}
