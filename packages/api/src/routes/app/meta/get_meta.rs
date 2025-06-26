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
use flow_like_types::{anyhow, bail};
use sea_orm::{
    ColumnTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect, RelationTrait,
};
#[tracing::instrument(name = "GET /apps/{app_id}/meta", skip(state, user, query))]
pub async fn get_meta(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Query(query): Query<LanguageParams>,
    Path(app_id): Path<String>,
) -> Result<Json<Metadata>, ApiError> {
    ensure_in_project!(user, &app_id, &state);
    let language = query.language.clone().unwrap_or_else(|| "en".to_string());

    let cache_key = format!("get_app_meta:{}:{}:{:?}", language, app_id, query);
    if let Some(cached) = state.get_cache(&cache_key) {
        return Ok(Json(cached));
    }

    let apps = app::Entity::find()
        .find_with_related(meta::Entity)
        .filter(
            meta::Column::Lang
                .eq(&language)
                .or(meta::Column::Lang.eq("en")),
        )
        .filter(app::Column::Id.eq(&app_id))
        .all(&state.db)
        .await?;

    if apps.is_empty() {
        return Err(ApiError::NotFound);
    }

    if apps.len() > 1 {
        return Err(ApiError::Internal(
            anyhow!("Multiple apps found for ID: {}", app_id).into(),
        ));
    }

    let Some(metadata) = apps[0]
        .1
        .iter()
        .find(|meta| meta.lang == language)
        .or_else(|| apps[0].1.iter().next())
        .map(|meta| Metadata::from(meta.clone()))
    else {
        return Err(ApiError::NotFound);
    };

    state.set_cache(cache_key, &metadata);

    Ok(Json(metadata))
}
