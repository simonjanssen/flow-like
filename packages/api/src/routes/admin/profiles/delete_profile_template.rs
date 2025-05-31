use crate::{
    entity::{profile, template_profile},
    error::ApiError,
    middleware::jwt::AppUser,
    permission::global_permission::GlobalPermission,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like::profile::{Profile, Settings};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde_json::from_value;

#[tracing::instrument(name = "DELETE /admin/profiles/{profile_id}", skip(state, user))]
pub async fn delete_profile_template(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(profile_id): Path<String>,
) -> Result<Json<Vec<Profile>>, ApiError> {
    user.check_global_permission(&state, GlobalPermission::WriteBits)
        .await?;

    let profiles = template_profile::Entity::delete_many()
        .filter(template_profile::Column::Id.eq(profile_id))
        .exec_with_returning(&state.db)
        .await?;

    let profiles: Vec<Profile> = profiles.into_iter().map(Profile::from).collect();

    Ok(Json(profiles))
}
