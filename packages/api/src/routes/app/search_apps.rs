use crate::{
    entity::{
        app, membership, meta,
        sea_orm_active_enums::{Category, Visibility},
    },
    error::ApiError,
    middleware::jwt::AppUser,
    routes::LanguageParams,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Query, State},
};
use flow_like::{
    app::{App, AppSearchQuery, AppSearchSort},
    bit::Metadata,
};
use sea_orm::{
    ColumnTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect, RelationTrait,
};
#[tracing::instrument(name = "GET /app/search", skip(state, user, search_query, query))]

pub async fn search_apps(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Query(query): Query<LanguageParams>,
    Json(search_query): Json<AppSearchQuery>,
) -> Result<Json<Vec<(App, Option<Metadata>)>>, ApiError> {
    if !state.platform_config.features.unauthorized_read {
        user.sub()?;
    }

    let language = query.language.clone().unwrap_or_else(|| "en".to_string());
    let sort = search_query
        .sort
        .unwrap_or_else(|| AppSearchSort::MostRelevant);

    let limit = std::cmp::min(search_query.limit.unwrap_or(50), 100);
    let mut qb = app::Entity::find()
        .filter(
            app::Column::Visibility
                .eq(Visibility::Public)
                .or(app::Column::Visibility.eq(Visibility::PublicRequestAccess)),
        )
        .limit(Some(limit))
        .offset(search_query.offset);

    match sort {
        AppSearchSort::BestRated => qb = qb.order_by_desc(app::Column::AvgRating),
        AppSearchSort::WorstRated => qb = qb.order_by_asc(app::Column::AvgRating),
        AppSearchSort::MostPopular => qb = qb.order_by_desc(app::Column::RatingSum),
        AppSearchSort::LeastPopular => qb = qb.order_by_asc(app::Column::RatingSum),
        AppSearchSort::MostRelevant => qb = qb.order_by_desc(app::Column::RelevanceScore),
        AppSearchSort::LeastRelevant => qb = qb.order_by_asc(app::Column::RelevanceScore),
        AppSearchSort::NewestCreated => qb = qb.order_by_desc(app::Column::CreatedAt),
        AppSearchSort::OldestCreated => qb = qb.order_by_asc(app::Column::CreatedAt),
        AppSearchSort::NewestUpdated => qb = qb.order_by_desc(app::Column::UpdatedAt),
        AppSearchSort::OldestUpdated => qb = qb.order_by_asc(app::Column::UpdatedAt),
    }

    if let Some(types) = search_query.categories {
        let types: Vec<Category> = types.into_iter().map(Into::into).collect();
        qb = qb.filter(
            app::Column::PrimaryCategory
                .is_in(types.clone())
                .or(app::Column::SecondaryCategory.is_in(types)),
        );
    }

    if let Some(search_str) = search_query.search {
        qb = qb.filter(
            meta::Column::Description
                .contains(&search_str)
                .or(meta::Column::Name.contains(&search_str)),
        )
    }

    if let Some(tag) = search_query.tag {
        qb = qb.filter(meta::Column::Tags.contains(&tag));
    }

    qb = qb.filter(
        meta::Column::Lang
            .is_null()
            .or(meta::Column::Lang.eq(&language))
            .or(meta::Column::Lang.eq("en")),
    );

    let models = qb
        .find_with_related(meta::Entity)
        .all(&state.db)
        .await
        .map_err(ApiError::from)?;

    let apps = models
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

    Ok(Json(apps))
}
