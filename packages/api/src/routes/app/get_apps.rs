use crate::{
    entity::{app, membership, meta},
    error::ApiError,
    middleware::jwt::AppUser,
    routes::LanguageParams,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Query, State},
};
use flow_like::{app::App, bit::Metadata};
use sea_orm::{
    ColumnTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect, RelationTrait,
};
#[tracing::instrument(name = "GET /app", skip(state, user))]
pub async fn get_apps(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Query(query): Query<LanguageParams>,
) -> Result<Json<Vec<(App, Option<Metadata>)>>, ApiError> {
    let language = query.language.clone().unwrap_or_else(|| "en".to_string());

    let sub = user.sub()?;

    let cache_key = format!("get_apps:{}:{}:{:?}", sub, language, query);
    if let Some(cached) = state.get_cache(&cache_key) {
        return Ok(Json(cached));
    }

    let apps = app::Entity::find()
        .order_by_desc(app::Column::UpdatedAt)
        .join(JoinType::InnerJoin, app::Relation::Membership.def())
        .find_with_related(meta::Entity)
        .filter(
            meta::Column::Lang
                .eq(&language)
                .or(meta::Column::Lang.eq("en")),
        )
        .filter(membership::Column::UserId.eq(sub))
        .limit(query.limit)
        .offset(query.offset)
        .all(&state.db)
        .await?;

    let apps = apps
        .into_iter()
        .map(|(app_model, meta_models)| {
            let metadata = meta_models
                .iter()
                .find(|meta| meta.lang == language)
                .or_else(|| meta_models.iter().next())
                .map(|meta| Metadata::from(meta.clone()));

            (App::from(app_model), metadata)
        })
        .collect();

    state.set_cache(cache_key, &apps);

    Ok(Json(apps))
}
