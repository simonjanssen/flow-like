use crate::{
    ensure_permission, entity::template, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

#[tracing::instrument(
    name = "DELETE /app/{app_id}/template/{template_id}",
    skip(state, user)
)]
pub async fn delete_templates(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, template_id)): Path<(String, String)>,
) -> Result<Json<Vec<template::Model>>, ApiError> {
    ensure_permission!(user, &app_id, &state, RolePermissions::WriteTemplates);

    let templates = template::Entity::delete_many()
        .filter(
            template::Column::AppId
                .eq(app_id)
                .and(template::Column::Id.eq(template_id)),
        )
        .exec_with_returning(&state.db)
        .await?;

    Ok(Json(templates))
}
