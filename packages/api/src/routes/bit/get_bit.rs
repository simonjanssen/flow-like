use std::{sync::Arc, time::Duration};

use crate::{entity::bit, error::ApiError, middleware::jwt::AppUser, state::AppState};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like::bit::Bit;
use flow_like_storage::files::store::FlowLikeStore;
use sea_orm::EntityTrait;

#[tracing::instrument(name = "GET /bit/{bit_id}", skip(state, user))]
pub async fn get_bit(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(bit_id): Path<String>,
) -> Result<Json<Bit>, ApiError> {
    if !state.platform_config.features.unauthorized_read {
        user.sub()?;
    }

    // TODO: overwrite the link with a signed URL to the S3 bucket.
    // let master_store = state.master_credentials().await?.to_store(false).await?;

    let bit = bit::Entity::find_by_id(&bit_id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;

    let mut bit: Bit = bit.into();

    if !state.platform_config.features.unauthorized_read {
        bit = temporary_bit(bit, &state.cdn_bucket).await?;
    }

    Ok(Json(bit))
}

#[tracing::instrument(name = "sign_bit", skip(bit, store))]
pub async fn temporary_bit(bit: Bit, store: &Arc<FlowLikeStore>) -> flow_like_types::Result<Bit> {
    let mut bit = bit;

    let path = flow_like_storage::object_store::path::Path::from("bits").child(bit.hash.clone());
    let url = store
        .sign("GET", &path, Duration::from_secs(60 * 60 * 24))
        .await?;
    bit.download_link = Some(url.to_string());

    Ok(bit)
}
