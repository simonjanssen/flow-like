use crate::{
    ensure_in_project, ensure_permission,
    entity::{app, membership, meta},
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
use sea_orm::{
    ColumnTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect, RelationTrait,
};
#[tracing::instrument(name = "GET /apps/{app_id}", skip(state, user))]
pub async fn get_app(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
) -> Result<Json<App>, ApiError> {
    ensure_in_project!(user, &app_id, &state);

    let cache_key = format!("get_app:{}", app_id);
    if let Some(cached) = state.get_cache(&cache_key) {
        return Ok(Json(cached));
    }

    let app = app::Entity::find_by_id(&app_id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;

    let app: App = app.into();
    state.set_cache(cache_key, &app);

    Ok(Json(app))
}
