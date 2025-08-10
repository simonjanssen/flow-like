use flow_like::app::App;
use tauri::AppHandle;

use crate::{functions::TauriFunctionError, state::TauriFlowLikeState};


#[tauri::command(async)]
pub async fn export_app(app_handle: AppHandle, app_id: String) -> Result<App, TauriFunctionError> {
    let flow_like_state = TauriFlowLikeState::construct(&app_handle).await?;

    if let Ok(app) = App::load(app_id, flow_like_state).await {
        return Ok(app);
    }

    Err(TauriFunctionError::new("App not found"))
}