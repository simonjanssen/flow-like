use super::TauriFunctionError;
use crate::state::{TauriFlowLikeState, TauriSettingsState};
use flow_like::{
    app::App,
    bit::Metadata,
    flow::{board::Board, variable::Variable},
    flow_like_storage::Path,
    profile::ProfileApp,
};
use futures::{StreamExt, TryStreamExt};
use serde_json::Value;
use std::collections::HashSet;
use tauri::AppHandle;

#[tauri::command(async)]
pub async fn get_apps(
    app_handle: AppHandle,
    language: Option<String>,
) -> Result<Vec<(App, Option<Metadata>)>, TauriFunctionError> {
    let mut app_list: Vec<(App, Option<Metadata>)> = vec![];

    let profile = TauriSettingsState::current_profile(&app_handle).await?;

    let flow_like_state = TauriFlowLikeState::construct(&app_handle).await?;

    for app in profile.hub_profile.apps.unwrap_or_default().iter() {
        let app_id = app.app_id.clone();
        if let Ok(app) = App::load(app_id.clone(), flow_like_state.clone()).await {
            let app = app;
            let metadata = App::get_meta(
                app_id.clone(),
                flow_like_state.clone(),
                language.clone(),
                None,
            )
            .await
            .ok();
            app_list.push((app, metadata));
        }
    }

    Ok(app_list)
}

#[tauri::command(async)]
pub async fn get_app(app_handle: AppHandle, app_id: String) -> Result<App, TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&app_handle).await?;

    if let Ok(app) = App::load(app_id, flow_like_state).await {
        return Ok(app);
    }

    Err(TauriFunctionError::new("App not found"))
}

#[tauri::command(async)]
pub async fn app_configured(
    app_handle: AppHandle,
    app_id: String,
) -> Result<bool, TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&app_handle).await?;

    if let Ok(app) = App::load(app_id, flow_like_state).await {
        let configured = app.boards_configured().await;
        return Ok(configured);
    }

    Err(TauriFunctionError::new("App not found"))
}

#[tauri::command(async)]
pub async fn create_app(
    app_handle: AppHandle,
    metadata: Metadata,
    bits: Vec<String>,
    template: String,
) -> Result<String, TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&app_handle).await?;

    let bits_map: HashSet<String> = bits.clone().into_iter().collect();
    let mut new_app = App::new(None, metadata, bits, flow_like_state).await?;

    if template == "blank" {
        let board = new_app.create_board(None).await?;
        let board = new_app.open_board(board, Some(false), None).await?;
        let mut variable = Variable::new(
            "Embedding Models",
            flow_like::flow::variable::VariableType::String,
            flow_like::flow::pin::ValueType::HashSet,
        );
        variable
            .set_exposed(false)
            .set_editable(false)
            .set_default_value(serde_json::json!(bits_map));

        let mut board = board.lock().await;
        board.variables.insert(variable.id.clone(), variable);
        board.save(None).await?;
    }

    new_app.save().await?;

    let mut profile = TauriSettingsState::current_profile(&app_handle).await?;
    let settings = TauriSettingsState::construct(&app_handle).await?;
    let mut settings = settings.lock().await;

    if profile.hub_profile.apps.is_none() {
        profile.hub_profile.apps = Some(vec![]);
    }

    if let Some(apps) = &mut profile.hub_profile.apps {
        apps.push(ProfileApp::new(new_app.id.clone()));
    }

    settings
        .profiles
        .insert(profile.hub_profile.id.clone(), profile.clone());
    settings.serialize();

    Ok(new_app.id.clone())
}

#[tauri::command(async)]
pub async fn create_app_board(
    app_handle: AppHandle,
    app_id: String,
    name: String,
    description: String,
) -> Result<(), TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&app_handle).await?;
    let mut app = App::load(app_id, flow_like_state).await?;

    let board = app
        .boards
        .first()
        .ok_or(TauriFunctionError::new("No boards found"))?;
    let board = app.open_board(board.clone(), Some(false), None).await?;
    let board = board.lock().await;
    let (_var_id, variable) = board
        .variables
        .iter()
        .find(|(_, variable)| variable.name == "Embedding Models" && !variable.editable)
        .ok_or(TauriFunctionError::new("No models variable found"))?;
    let variable: Variable = variable.duplicate();
    drop(board);

    let board_id = app.create_board(None).await?;
    let board = app.open_board(board_id, Some(false), None).await?;
    app.save().await?;

    let mut board = board.lock().await;
    board.name = name;
    board.description = description;
    board.variables.insert(variable.id.clone(), variable);
    board.save(None).await?;

    Ok(())
}

#[tauri::command(async)]
pub async fn delete_app_board(
    app_handle: AppHandle,
    app_id: String,
    board_id: String,
) -> Result<(), TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&app_handle).await?;

    let mut app = App::load(app_id, flow_like_state).await?;
    if app.boards.len() == 1 {
        return Err(TauriFunctionError::new("Cannot delete the last board"));
    }
    app.delete_board(&board_id).await?;
    app.save().await?;
    Ok(())
}

#[tauri::command(async)]
pub async fn update_app(app_handle: AppHandle, app: App) -> Result<(), TauriFunctionError> {
    let mut app = app;
    app.app_state = Some(TauriFlowLikeState::construct(&app_handle).await?);
    app.save().await?;
    Ok(())
}

#[tauri::command(async)]
pub async fn push_app_meta(
    app_handle: AppHandle,
    app_id: String,
    metadata: Metadata,
    language: Option<String>,
) -> Result<(), TauriFunctionError> {
    let state = TauriFlowLikeState::construct(&app_handle).await?;
    App::push_meta(app_id, metadata, state, language, None).await?;
    Ok(())
}

#[tauri::command(async)]
pub async fn get_app_meta(
    app_handle: AppHandle,
    app_id: String,
    language: Option<String>,
) -> Result<Metadata, TauriFunctionError> {
    let metadata = App::get_meta(
        app_id,
        TauriFlowLikeState::construct(&app_handle).await?,
        language,
        None,
    )
    .await
    .map_err(|_| TauriFunctionError::new("Failed to get app metadata"))?;
    Ok(metadata)
}

#[tauri::command(async)]
pub async fn get_app_size(
    app_handle: AppHandle,
    app_id: String,
) -> Result<usize, TauriFunctionError> {
    let content_store = TauriFlowLikeState::get_project_storage_store(&app_handle).await?;
    let path = Path::from("apps").child(app_id);

    let mut locations = content_store
        .list(Some(&path))
        .map_ok(|m| m.location)
        .boxed();
    let mut size = 0;

    while let Some(location) = locations.next().await {
        if let Ok(location) = location {
            if let Ok(meta) = content_store.head(&location).await {
                size += meta.size;
            }
        }
    }

    Ok(size)
}

#[tauri::command(async)]
pub async fn delete_app(app_handle: AppHandle, app_id: String) -> Result<(), TauriFunctionError> {
    if app_id.is_empty() {
        return Err(TauriFunctionError::new("App ID is empty"));
    };

    let store = TauriFlowLikeState::get_project_storage_store(&app_handle).await?;
    let settings = TauriSettingsState::construct(&app_handle).await?;

    let mut settings = settings.lock().await;
    for profile in settings.profiles.values_mut() {
        if let Some(apps) = &mut profile.hub_profile.apps {
            apps.retain(|app| &app.app_id != &app_id);
        }
    }
    settings.serialize();
    drop(settings);

    let path = Path::from("apps").child(app_id);
    let locations = store.list(Some(&path)).map_ok(|m| m.location).boxed();
    store
        .delete_stream(locations)
        .try_collect::<Vec<Path>>()
        .await
        .map_err(|_| TauriFunctionError::new("Failed to delete app"))?;

    Ok(())
}

#[tauri::command(async)]
pub async fn get_app_boards(
    app_handle: AppHandle,
    app_id: String,
) -> Result<Vec<Board>, TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&app_handle).await?;

    let mut boards = vec![];
    if let Ok(app) = App::load(app_id, flow_like_state).await {
        for board_id in app.boards.iter() {
            let board = app.open_board(board_id.clone(), Some(false), None).await;
            if let Ok(board) = board {
                boards.push(board.lock().await.clone());
            }
        }
    }

    Ok(boards)
}

#[tauri::command(async)]
pub async fn get_app_board(
    app_handle: AppHandle,
    app_id: String,
    board_id: String,
    push_to_registry: bool,
) -> Result<Board, TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&app_handle).await?;

    if let Ok(app) = App::load(app_id, flow_like_state).await {
        let board = app
            .open_board(board_id, Some(push_to_registry), None)
            .await?;
        return Ok(board.lock().await.clone());
    }

    Err(TauriFunctionError::new("Board not found"))
}

#[tauri::command(async)]
pub async fn set_app_config(
    app_handle: AppHandle,
    app_id: String,
    board_id: String,
    variable_id: String,
    default_value: Value,
) -> Result<(), TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&app_handle).await?;

    if let Ok(app) = App::load(app_id, flow_like_state).await {
        let board = app.open_board(board_id, Some(true), None).await?;
        let mut board = board.lock().await;
        if let Some(variable) = board.variables.get_mut(&variable_id) {
            variable.default_value = Some(serde_json::to_vec(&default_value).unwrap());
        }
        board.save(None).await?;
    }

    Err(TauriFunctionError::new("Board not found"))
}
