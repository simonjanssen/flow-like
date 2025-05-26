use crate::{
    entity::{app, membership},
    error::ApiError,
    middleware::jwt::AppUser,
    state::AppState,
};
use axum::{Extension, Json, extract::State};
use sea_orm::{ColumnTrait, EntityTrait, JoinType, QueryFilter, QuerySelect, RelationTrait};

#[tracing::instrument(name = "GET /app", skip(state, user))]
pub async fn get_apps(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
) -> Result<Json<Vec<app::Model>>, ApiError> {
    let sub = user.sub()?;
    let apps = app::Entity::find()
        .join(JoinType::InnerJoin, app::Relation::Membership.def())
        .filter(membership::Column::UserId.eq(sub))
        .all(&state.db)
        .await?;

    Ok(Json(apps))
}
