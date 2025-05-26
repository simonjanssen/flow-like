use crate::{entity::profile, error::ApiError, middleware::jwt::AppUser, state::AppState};
use axum::{Extension, Json, extract::State};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

#[tracing::instrument(name = "GET /profile", skip(state, user))]
pub async fn get_profiles(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
) -> Result<Json<Vec<profile::Model>>, ApiError> {
    let sub = user.sub()?;
    let profiles = profile::Entity::find()
        .filter(profile::Column::UserId.eq(sub))
        .all(&state.db)
        .await?;

    Ok(Json(profiles))
}
