use crate::{
    entity::{bit, meta, sea_orm_active_enums::BitType},
    error::ApiError,
    middleware::jwt::AppUser,
    routes::LanguageParams,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Query, State},
};
use flow_like::{bit::Bit, hub::BitSearchQuery};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QuerySelect};

use super::get_bit::temporary_bit;

#[tracing::instrument(name = "POST /bit", skip(state, user, bit_query, lang_query))]
pub async fn search_bits(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Query(lang_query): Query<LanguageParams>,
    Json(bit_query): Json<BitSearchQuery>,
) -> Result<Json<Vec<Bit>>, ApiError> {
    if !state.platform_config.features.unauthorized_read {
        user.sub()?;
    }

    let language = lang_query.language.as_deref().unwrap_or("en");

    let limit = std::cmp::min(bit_query.limit.unwrap_or(50), 100);
    let mut qb = bit::Entity::find()
        .limit(Some(limit))
        .offset(bit_query.offset);

    if let Some(types) = bit_query.bit_types {
        let types: Vec<BitType> = types.into_iter().map(Into::into).collect();
        qb = qb.filter(bit::Column::Type.is_in(types));
    }

    // qb = qb.left_join(meta::Entity);

    if let Some(search_str) = bit_query.search {
        qb = qb.filter(
            meta::Column::Description
                .contains(&search_str)
                .or(meta::Column::Name.contains(&search_str)),
        )
    }

    qb = qb.filter(
        meta::Column::Lang
            .is_null()
            .or(meta::Column::Lang.eq(language))
            .or(meta::Column::Lang.eq("en")),
    );

    let models = qb
        .find_with_related(meta::Entity)
        .all(&state.db)
        .await
        .map_err(ApiError::from)?;

    let mut bits = models
        .into_iter()
        .map(|(bit_model, meta_models)| {
            let mut bit: Bit = Bit::from(bit_model);
            if meta_models.len() == 1 {
                // If there's only one metadata, use it directly
                bit.meta
                    .insert(language.to_string(), meta_models[0].clone().into());
            }

            let requested_lang_or_en = meta_models
                .iter()
                .find(|meta| meta.lang == language)
                .or_else(|| meta_models.iter().next())
                .cloned();

            if let Some(requested_lang_or_en) = requested_lang_or_en {
                bit.meta.insert(
                    requested_lang_or_en.lang.clone(),
                    requested_lang_or_en.into(),
                );
            }
            bit
        })
        .collect::<Vec<_>>();

    if !state.platform_config.features.unauthorized_read {
        for bit in bits.iter_mut() {
            *bit = temporary_bit(bit.clone(), &state.cdn_bucket).await?;
        }
    }

    Ok(Json(bits))
}
