use crate::{
    entity::meta,
    error::ApiError,
    middleware::jwt::AppUser,
    routes::app::meta::{MetaMode, MetaQuery},
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use flow_like_types::create_id;
use sea_orm::{ActiveModelTrait, EntityTrait, TransactionTrait};

#[tracing::instrument(name = "PUT /apps/{app_id}/meta", skip(state, user))]
pub async fn upsert_meta(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
    Query(query): Query<MetaQuery>,
    Json(meta): Json<flow_like::bit::Metadata>,
) -> Result<Json<()>, ApiError> {
    let mode = MetaMode::new(&query, &app_id);
    mode.ensure_write_permission(&user, &app_id, &state).await?;

    let language = query.language.as_deref().unwrap_or("en");
    let mut model = meta::Model::from(meta.clone());

    model.lang = language.to_string();
    model.updated_at = chrono::Utc::now().naive_utc();

    model.template_id = None;
    model.bit_id = None;
    model.app_id = None;
    model.course_id = None;

    match &mode {
        MetaMode::Template(id) => {
            model.template_id = Some(id.clone());
        }
        MetaMode::App(id) => {
            model.app_id = Some(id.clone());
        }
        MetaMode::Course(id) => {
            model.course_id = Some(id.clone());
        }
    }

    let txn = state.db.begin().await?;

    let existing_meta = mode.find_existing_meta(language, &txn).await?;

    if let Some(existing) = existing_meta {
        model.created_at = existing.created_at;
        model.id = existing.id;
        model.icon = existing.icon;
        model.thumbnail = existing.thumbnail;
        let mut active_model: meta::ActiveModel = model.into();
        active_model = active_model.reset_all();
        active_model.update(&txn).await?;
        txn.commit().await?;
        return Ok(Json(()));
    }

    model.id = create_id();
    model.created_at = chrono::Utc::now().naive_utc();
    let active_model: meta::ActiveModel = model.into();
    active_model.insert(&txn).await?;
    txn.commit().await?;

    Ok(Json(()))
}
