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
    ColumnTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect, RelationTrait,
    TransactionTrait,
};

#[tracing::instrument(name = "GET /apps/{app_id}/roles", skip(state, user))]
pub async fn get_roles(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
) -> Result<Json<(Option<String>, Vec<role::Model>)>, ApiError> {
    ensure_permission!(user, &app_id, &state, RolePermissions::ReadRoles);

    let txn = state.db.begin().await?;

    let app = app::Entity::find_by_id(app_id.clone())
        .one(&txn)
        .await?
        .ok_or_else(|| {
            tracing::warn!("App {} not found", app_id);
            ApiError::NotFound
        })?;

    let roles = role::Entity::find()
        .filter(role::Column::AppId.eq(app_id.clone()))
        .all(&txn)
        .await?;

    Ok(Json((app.default_role_id, roles)))
}
