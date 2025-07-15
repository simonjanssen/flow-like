use crate::{
    ensure_in_project,
    entity::{app, meta},
    error::ApiError,
    middleware::jwt::AppUser,
    routes::{app::meta::{MetaMode, MetaQuery}, LanguageParams},
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use flow_like::bit::Metadata;
use flow_like_types::anyhow;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, TransactionTrait};
#[tracing::instrument(name = "GET /apps/{app_id}/meta", skip(state, user, query))]
pub async fn get_meta(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Query(query): Query<MetaQuery>,
    Path(app_id): Path<String>,
) -> Result<Json<Metadata>, ApiError> {
    let mode = MetaMode::new(&query, &app_id);
    mode.ensure_read_permission(&user, &app_id, &state).await?;

    let language = query.language.clone().unwrap_or_else(|| "en".to_string());
    let txn = state.db.begin().await?;

    let existing_meta = mode.find_existing_meta(&language, &txn).await?.ok_or_else(|| {
        ApiError::NotFound
    })?;

    let metadata = Metadata::from(existing_meta.clone());

    Ok(Json(metadata))
}
