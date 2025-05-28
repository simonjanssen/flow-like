use crate::{
    entity::{bit, meta, sea_orm_active_enums::BitType},
    error::ApiError,
    middleware::jwt::AppUser,
    state::AppState,
};
use axum::{Extension, Json, extract::State};
use flow_like::bit::{Bit, BitTypes};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QuerySelect};
use serde::{Deserialize, Serialize};

use super::get_bit::temporary_bit;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Query {
    pub search: Option<String>,
    pub limit: Option<u64>,
    pub offset: Option<u64>,
    pub bit_types: Option<Vec<BitTypes>>,
}

#[tracing::instrument(name = "POST /bit", skip(state, user))]
pub async fn search_bits(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Json(query): Json<Query>,
) -> Result<Json<Vec<Bit>>, ApiError> {
    if !state.platform_config.features.unauthorized_read {
        user.sub()?;
    }

    let mut qb = bit::Entity::find();

    if let Some(limit) = query.limit {
        qb = qb.limit(Some(limit));
    }
    if let Some(offset) = query.offset {
        qb = qb.offset(Some(offset));
    }
    if let Some(types) = query.bit_types {
        let types: Vec<BitType> = types.into_iter().map(Into::into).collect();
        qb = qb.filter(bit::Column::Type.is_in(types));
    }

    if let Some(search_str) = query.search {
        qb = qb
            .inner_join(meta::Entity)
            .filter(
                meta::Column::Description
                    .contains(&search_str)
                    .or(meta::Column::Name.contains(&search_str)),
            )
            .group_by(bit::Column::Id);
    }

    let models = qb.all(&state.db).await.map_err(ApiError::from)?;

    let mut bits = models.into_iter().map(Bit::from).collect::<Vec<_>>();

    if !state.platform_config.features.unauthorized_read {
        for bit in bits.iter_mut() {
            *bit = temporary_bit(bit.clone(), &state.cdn_bucket).await?;
        }
    }

    Ok(Json(bits))
}
