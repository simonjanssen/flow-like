use std::time::Duration;

use crate::{
    entity::{profile, template_profile},
    error::ApiError,
    middleware::jwt::AppUser,
    permission::global_permission::GlobalPermission,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like::profile::{Profile, Settings};
use flow_like_types::create_id;
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter};
use serde_json::{Value, from_value, to_value};

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct SignedProfileImgUrl {
    pub url: String,
    pub final_url: Option<String>,
}

#[tracing::instrument(name = "GET /admin/profiles/media", skip(state, user))]
pub async fn get_signed_profile_img_url(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
) -> Result<Json<SignedProfileImgUrl>, ApiError> {
    user.check_global_permission(&state, GlobalPermission::WriteBits)
        .await?;

    let id = create_id();
    let cdn_bucket = state.cdn_bucket.clone();
    let path =
        flow_like_storage::object_store::path::Path::from("profiles").child(format!("{}.webp", id));

    let url = cdn_bucket
        .sign("PUT", &path, Duration::from_secs(60 * 60))
        .await?;
    let final_url = if let Some(url) = state.platform_config.cdn.as_ref() {
        Some(format!("{}/{}", url, path.to_string()))
    } else {
        None
    };
    let signed_url = SignedProfileImgUrl {
        url: url.to_string(),
        final_url,
    };

    Ok(Json(signed_url))
}
