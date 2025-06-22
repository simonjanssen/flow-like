use crate::{
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
use flow_like_types::{anyhow, bail, create_id};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, JoinType, QueryFilter,
    QueryOrder, QuerySelect, RelationTrait,
};

#[tracing::instrument(name = "PUT /apps/{app_id}/meta", skip(state, user, payload, query))]
pub async fn upsert_meta(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Query(query): Query<LanguageParams>,
    Path(app_id): Path<String>,
    Json(payload): Json<Metadata>,
) -> Result<Json<()>, ApiError> {
    user.sub()?;

    let language = query.language.clone().unwrap_or_else(|| "en".to_string());
    let permission = user.app_permission(&app_id, &state).await?;

    if !permission.has_permission(RolePermissions::WriteMeta) {
        return Err(ApiError::Forbidden);
    }

    let meta = meta::Entity::find()
        .filter(meta::Column::AppId.eq(&app_id))
        .filter(meta::Column::Lang.eq(&language))
        .one(&state.db)
        .await?;

    let mut payload_model: meta::Model = payload.into();
    payload_model.updated_at = chrono::Utc::now().naive_utc();

    if let Some(existing_meta) = meta {
        payload_model.id = existing_meta.id;
        payload_model.lang = existing_meta.lang;
        payload_model.app_id = existing_meta.app_id;
        payload_model.bit_id = existing_meta.bit_id;
        payload_model.course_id = existing_meta.course_id;
        payload_model.icon = existing_meta.icon;
        payload_model.thumbnail = existing_meta.thumbnail;
        payload_model.template_id = existing_meta.template_id;

        let active_model: meta::ActiveModel = payload_model.into();

        active_model.update(&state.db).await?;
        return Ok(Json(()));
    }

    let mut icon = None;
    let mut thumbnail = None;
    let mut preview_media = None;

    if language != "en" {
        let english_language_item = meta::Entity::find()
            .filter(meta::Column::AppId.eq(&app_id))
            .filter(meta::Column::Lang.eq("en"))
            .one(&state.db)
            .await?;

        if let Some(english_meta) = english_language_item {
            icon = english_meta.icon.clone();
            thumbnail = english_meta.thumbnail.clone();
            preview_media = english_meta.preview_media.clone();
        }
    }

    payload_model.id = create_id();
    payload_model.app_id = Some(app_id.clone());
    payload_model.lang = language.clone();
    payload_model.bit_id = None;
    payload_model.course_id = None;
    payload_model.template_id = None;
    payload_model.icon = icon;
    payload_model.thumbnail = thumbnail;
    payload_model.preview_media = preview_media;
    payload_model.created_at = chrono::Utc::now().naive_utc();

    let meta_model: meta::ActiveModel = payload_model.into();

    meta_model.insert(&state.db).await?;

    Ok(Json(()))
}
