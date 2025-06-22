use crate::{
    ensure_permission, entity::template, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

#[tracing::instrument(name = "GET /apps/{app_id}/template", skip(state, user))]
pub async fn get_templates(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
) -> Result<Json<Vec<template::Model>>, ApiError> {
    ensure_permission!(user, &app_id, &state, RolePermissions::ReadTemplates);

    let templates = template::Entity::find()
        .filter(template::Column::AppId.eq(app_id))
        .all(&state.db)
        .await?;

    Ok(Json(templates))
}
