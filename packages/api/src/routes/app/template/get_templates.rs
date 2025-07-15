use crate::{
    ensure_permission,
    entity::{meta, template},
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
use flow_like::bit::Metadata;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

#[tracing::instrument(name = "GET /apps/{app_id}/templates", skip(state, user))]
pub async fn get_templates(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
    Query(query): Query<LanguageParams>,
) -> Result<Json<Vec<(String, String, Metadata)>>, ApiError> {
    ensure_permission!(user, &app_id, &state, RolePermissions::ReadTemplates);

    let language = query.language.as_deref().unwrap_or("en");

    let templates = template::Entity::find()
        .find_with_related(meta::Entity)
        .filter(template::Column::AppId.eq(&app_id))
        .filter(
            meta::Column::Lang
                .eq(language)
                .or(meta::Column::Lang.eq("en")),
        )
        .all(&state.db)
        .await?;

    let templates = templates
        .into_iter()
        .filter_map(|(t, m)| {
            m.iter()
                .find(|meta| &meta.lang == language)
                .or_else(|| m.iter().find(|meta| &meta.lang == "en"))
                .map(|meta| (app_id.clone(), t.id.clone(), Metadata::from(meta.clone())))
        })
        .collect();

    Ok(Json(templates))
}
