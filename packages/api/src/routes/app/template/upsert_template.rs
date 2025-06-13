use crate::{
    ensure_permission,
    entity::{meta, template},
    error::ApiError,
    middleware::jwt::{AppPermissionResponse, AppUser},
    permission::role_permission::RolePermissions,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like::flow::board::VersionType;
use flow_like_types::{anyhow, create_id};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

#[derive(Clone, Deserialize, Serialize)]
pub struct TemplateUpsert {
    pub changelog: Option<String>,
    pub version_type: Option<VersionType>,
    pub board_id: Option<String>,
    pub board_version: Option<(u32, u32, u32)>,
}

async fn create_template(
    user: AppUser,
    state: AppState,
    permission: &AppPermissionResponse,
    app_id: &str,
    template_data: &TemplateUpsert,
) -> Result<template::Model, ApiError> {
    if !permission.has_permission(RolePermissions::ReadBoards) {
        return Err(ApiError::Forbidden);
    }
    let template_id = create_id();
    let sub = user.sub()?;
    let mut app = state.scoped_app(&sub, app_id, &state).await?;
    let board_id = template_data.board_id.clone().ok_or(anyhow!(
        "Board ID is required for new templates".to_string()
    ))?;
    let (_, version) = app
        .upsert_template(
            Some(template_id.clone()),
            template_data
                .version_type
                .clone()
                .unwrap_or(VersionType::Minor),
            board_id,
            template_data.board_version,
        )
        .await?;
    let new_template = template::ActiveModel {
        id: Set(template_id.clone()),
        app_id: Set(app_id.to_string()),
        version: Set(Some(format!("{}.{}.{}", version.0, version.1, version.2))),
        changelog: Set(template_data.changelog.clone()),
        created_at: Set(chrono::Utc::now().naive_utc()),
        updated_at: Set(chrono::Utc::now().naive_utc()),
        ..Default::default()
    };

    let new_template = template::Entity::insert(new_template)
        .exec_with_returning(&state.db)
        .await?;

    let meta = meta::ActiveModel {
        id: Set(create_id()),
        lang: Set("en".to_string()),
        name: Set("New Template".to_string()),
        template_id: Set(Some(template_id)),
        created_at: Set(chrono::Utc::now().naive_utc()),
        updated_at: Set(chrono::Utc::now().naive_utc()),
        ..Default::default()
    };

    meta::Entity::insert(meta).exec(&state.db).await?;
    Ok(new_template)
}

#[tracing::instrument(
    name = "PUT /app/{app_id}/template/{template_id}",
    skip(state, user, template_data)
)]
pub async fn upsert_template(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, template_id)): Path<(String, String)>,
    Json(template_data): Json<TemplateUpsert>,
) -> Result<Json<template::Model>, ApiError> {
    let permission = ensure_permission!(user, &app_id, &state, RolePermissions::WriteTemplates);

    if template_id.is_empty() || app_id.is_empty() {
        return Err(ApiError::Forbidden);
    }

    let template = template::Entity::find()
        .filter(
            template::Column::AppId
                .eq(app_id.clone())
                .and(template::Column::Id.eq(template_id.clone())),
        )
        .one(&state.db)
        .await?;

    let mut template: template::ActiveModel = match template {
        Some(t) => t.into(),
        None => {
            let new_template =
                create_template(user, state, &permission, &app_id, &template_data).await?;

            return Ok(Json(new_template));
        }
    };

    if let Some(changelog) = template_data.changelog {
        template.changelog = Set(Some(changelog));
    }

    if let (Some(version_type), Some(board_id)) =
        (template_data.version_type, template_data.board_id)
    {
        if !permission.has_permission(RolePermissions::ReadBoards) {
            return Err(ApiError::Forbidden);
        }

        // Let´s create a new template version
        let sub = user.sub()?;
        let mut app = state.scoped_app(&sub, &app_id, &state).await?;
        let (_, version) = app
            .upsert_template(
                Some(template_id),
                version_type,
                board_id,
                template_data.board_version,
            )
            .await?;
        template.version = Set(Some(format!("{}.{}.{}", version.0, version.1, version.2)));
    }

    template.updated_at = Set(chrono::Utc::now().naive_utc());
    let template = template.update(&state.db).await?;

    Ok(Json(template))
}
