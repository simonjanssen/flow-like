use std::collections::HashMap;

use crate::{
    entity::{
        app::{self, Entity},
        invitations, membership, meta, user,
    },
    error::ApiError,
    middleware::jwt::AppUser,
    routes::LanguageParams,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Query, State},
};
use flow_like::{app::App, bit::Metadata};
use flow_like_types::anyhow;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect,
    RelationTrait, sqlx::types::chrono,
};

#[tracing::instrument(name = "GET /user/invites", skip(state, user))]
pub async fn get_invites(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Query(query): Query<LanguageParams>,
) -> Result<Json<Vec<(invitations::Model, String)>>, ApiError> {
    let sub = user.sub()?;

    let invitations = invitations::Entity::find()
        .order_by_desc(invitations::Column::CreatedAt)
        .filter(invitations::Column::UserId.eq(sub))
        .find_also_related(membership::Entity)
        .limit(query.limit)
        .offset(query.offset)
        .all(&state.db)
        .await?;

    let invitations = invitations
        .into_iter()
        .filter_map(|(invite, membership)| membership.map(|m| (invite, m.user_id)))
        .collect::<Vec<_>>();

    Ok(Json(invitations))
}
