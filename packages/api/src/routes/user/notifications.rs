use std::collections::HashMap;

use crate::{
    entity::{
        app::{self, Entity},
        invitation, membership, meta, user,
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
    ActiveModelTrait, ColumnTrait, EntityTrait, JoinType, PaginatorTrait, QueryFilter, QueryOrder,
    QuerySelect, RelationTrait, sqlx::types::chrono,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct NotificationOverview {
    pub invites_count: u64,
}

#[tracing::instrument(name = "GET /user/notifications", skip(state, user))]
pub async fn get_notifications(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
) -> Result<Json<NotificationOverview>, ApiError> {
    let sub = user.sub()?;

    let invites_count = invitation::Entity::find()
        .filter(invitation::Column::UserId.eq(sub))
        .count(&state.db)
        .await?;

    Ok(Json(NotificationOverview { invites_count }))
}
