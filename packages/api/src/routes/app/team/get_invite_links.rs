use crate::{
    ensure_in_project, ensure_permission,
    entity::{app, invite_link, membership, meta, role},
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
    QueryOrder, QuerySelect, RelationTrait, TransactionTrait, prelude::Expr,
};

#[tracing::instrument(name = "GET /apps/{app_id}/team/link", skip(state, user))]
pub async fn get_invite_links(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
) -> Result<Json<Vec<invite_link::Model>>, ApiError> {
    ensure_permission!(user, &app_id, &state, RolePermissions::Admin);

    let links = invite_link::Entity::find()
        .filter(invite_link::Column::AppId.eq(app_id.clone()))
        .all(&state.db)
        .await?;

    Ok(Json(links))
}
