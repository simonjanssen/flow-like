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
    ActiveValue::Set, ColumnTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect,
    RelationTrait, TransactionTrait, prelude::Expr,
};

#[tracing::instrument(name = "GET /apps/{app_id}/team/link", skip(state, user))]
pub async fn create_invite_link(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
) -> Result<Json<()>, ApiError> {
    ensure_permission!(user, &app_id, &state, RolePermissions::Admin);

    Ok(Json(()))
}
