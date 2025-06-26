use crate::{
    ensure_in_project, ensure_permission,
    entity::{app, membership, meta, role},
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
use flow_like_types::{anyhow, bail, create_id};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, JoinType, QueryFilter,
    QueryOrder, QuerySelect, RelationTrait,
};

#[tracing::instrument(name = "PUT /apps/{app_id}/roles/{role_id}", skip(state, user))]
pub async fn upsert_role(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, role_id)): Path<(String, String)>,
    Json(mut payload): Json<role::Model>,
) -> Result<Json<()>, ApiError> {
    ensure_permission!(user, &app_id, &state, RolePermissions::Admin);

    let permission = RolePermissions::from_bits(payload.permissions).ok_or(ApiError::Forbidden)?;

    let is_owner = permission.contains(RolePermissions::Owner);

    let role = role::Entity::find_by_id(role_id.clone())
        .filter(role::Column::AppId.eq(app_id.clone()))
        .one(&state.db)
        .await?;

    if let Some(role) = role {
        let permission = RolePermissions::from_bits(role.permissions).ok_or(ApiError::Forbidden)?;

        payload.id = role.id;
        payload.created_at = role.created_at;
        payload.updated_at = chrono::Utc::now().naive_utc();
        payload.app_id = role.app_id;

        if permission.contains(RolePermissions::Owner) {
            payload.permissions = role.permissions;
        }

        if is_owner && !permission.contains(RolePermissions::Owner) {
            tracing::warn!("Attempt to update a role with Owner permission");
            return Err(ApiError::Forbidden);
        }

        let payload: role::ActiveModel = payload.into();
        payload.update(&state.db).await?;
        return Ok(Json(()));
    }

    if is_owner {
        tracing::warn!("Attempt to create a role with Owner permission");
        return Err(ApiError::Forbidden);
    }

    payload.id = create_id();
    payload.created_at = chrono::Utc::now().naive_utc();
    payload.updated_at = chrono::Utc::now().naive_utc();
    payload.app_id = Some(app_id.clone());

    let role: role::ActiveModel = payload.into();
    role.insert(&state.db).await?;

    Ok(Json(()))
}
