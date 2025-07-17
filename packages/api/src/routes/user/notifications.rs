use crate::{entity::invitation, error::ApiError, middleware::jwt::AppUser, state::AppState};
use axum::{Extension, Json, extract::State};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter};
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
