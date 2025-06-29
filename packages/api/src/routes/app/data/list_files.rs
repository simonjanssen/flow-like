use crate::{
    ensure_in_project, ensure_permission,
    entity::{app, membership, meta},
    error::ApiError,
    middleware::jwt::AppUser,
    permission::role_permission::RolePermissions,
    routes::LanguageParams,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use flow_like::{app::App, bit::Metadata};
use flow_like_storage::{files::store::StorageItem, object_store::ObjectMeta};
use flow_like_types::anyhow;
use sea_orm::{
    ColumnTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect, RelationTrait,
};

#[derive(Debug, Clone, serde::Deserialize)]
pub struct ListFilesPayload {
    pub prefix: String,
}

#[tracing::instrument(name = "POST /apps/{app_id}/data/list", skip(state, user))]
pub async fn list_files(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
    Json(payload): Json<ListFilesPayload>,
) -> Result<Json<Vec<StorageItem>>, ApiError> {
    ensure_permission!(user, &app_id, &state, RolePermissions::ReadFiles);

    let sub = user.sub()?;

    let project_dir = state.scoped_credentials(&sub, &app_id).await?;
    let project_dir = project_dir.to_store(false).await?;
    let path = project_dir
        .construct_upload(&app_id, &payload.prefix, true)
        .await?;

    let items = project_dir
        .as_generic()
        .list_with_delimiter(Some(&path))
        .await
        .map_err(|e| anyhow!("Failed to list items: {}", e))?;

    let items: Vec<StorageItem> = items.objects.into_iter().map(StorageItem::from).collect();

    Ok(Json(items))
}
