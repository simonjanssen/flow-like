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
use flow_like_types::{anyhow, bail};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect,
    RelationTrait,
};

#[tracing::instrument(name = "DELETE /apps/{app_id}/roles/{role_id}", skip(state, user))]
pub async fn delete_role(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, role_id)): Path<(String, String)>,
) -> Result<Json<()>, ApiError> {
    ensure_permission!(user, &app_id, &state, RolePermissions::Admin);

    let role = role::Entity::find_by_id(role_id.clone())
        .filter(role::Column::AppId.eq(app_id.clone()))
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;

    let Some(permission) = RolePermissions::from_bits(role.permissions) else {
        return Err(ApiError::Forbidden);
    };

    if permission.contains(RolePermissions::Owner) {
        return Err(ApiError::Forbidden);
    }

    let role: role::ActiveModel = role.into();
    role.delete(&state.db).await?;

    Ok(Json(()))
}
