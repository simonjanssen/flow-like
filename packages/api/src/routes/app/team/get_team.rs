use crate::{
    ensure_permission, entity::membership, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, routes::LanguageParams, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder, QuerySelect};

#[tracing::instrument(name = "GET /apps/{app_id}/team", skip(state, user))]
pub async fn get_team(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
    Query(params): Query<LanguageParams>,
) -> Result<Json<Vec<membership::Model>>, ApiError> {
    ensure_permission!(user, &app_id, &state, RolePermissions::ReadTeam);

    let members = membership::Entity::find()
        .order_by_asc(membership::Column::CreatedAt)
        .filter(membership::Column::AppId.eq(app_id.clone()))
        .limit(params.limit)
        .offset(params.offset)
        .all(&state.db)
        .await?;

    Ok(Json(members))
}
