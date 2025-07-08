use crate::{
    ensure_in_project,
    entity::{app, meta},
    error::ApiError,
    middleware::jwt::AppUser,
    routes::LanguageParams,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use flow_like::bit::Metadata;
use flow_like_types::anyhow;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
#[tracing::instrument(name = "GET /apps/{app_id}/meta", skip(state, user, query))]
pub async fn get_meta(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Query(query): Query<LanguageParams>,
    Path(app_id): Path<String>,
) -> Result<Json<Metadata>, ApiError> {
    ensure_in_project!(user, &app_id, &state);
    let language = query.language.clone().unwrap_or_else(|| "en".to_string());

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
        .or_else(|| apps[0].1.first())
        .map(|meta| Metadata::from(meta.clone()))
    else {
        return Err(ApiError::NotFound);
    };

    Ok(Json(metadata))
}
