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
use flow_like_types::{anyhow, bail};
use sea_orm::{
    ActiveValue::Set, ColumnTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect,
    RelationTrait, TransactionTrait, prelude::Expr,
};

#[tracing::instrument(name = "DELETE /apps/{app_id}/team/link/{link_id}", skip(state, user))]
pub async fn remove_invite_link(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, link_id)): Path<(String, String)>,
) -> Result<Json<()>, ApiError> {
    ensure_permission!(user, &app_id, &state, RolePermissions::Admin);

    invite_link::Entity::delete_many()
        .filter(
            invite_link::Column::AppId
                .eq(app_id.clone())
                .and(invite_link::Column::Id.eq(link_id.clone())),
        )
        .exec(&state.db)
        .await?;

    Ok(Json(()))
}
