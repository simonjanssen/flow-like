use std::collections::HashMap;

use crate::{
    entity::{pat, prelude::*, technical_user, user},
    error::ApiError,
    middleware::jwt::AppUser,
    state::AppState,
};
use axum::{
    extract::{Path, State},
    Extension, Json,
};
use flow_like_types::Value;
use flow_like_types::{anyhow, bail};
use sea_orm::{sqlx::types::chrono, ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UserLookupResponse {
    id: String,
    username: Option<String>,
    name: Option<String>,
    avatar_url: Option<String>,
    additional_informatino: Option<Value>,
    description: Option<String>,
    created_at: chrono::NaiveDateTime,
}

impl From<user::Model> for UserLookupResponse {
    fn from(user: user::Model) -> Self {
        UserLookupResponse {
            id: user.id,
            username: user.username,
            name: user.name,
            avatar_url: user.avatar_url,
            additional_informatino: user.additional_information,
            description: user.description,
            created_at: user.created_at,
        }
    }
}

#[tracing::instrument(skip(state))]
pub async fn user_lookup(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(query): Path<String>,
) -> Result<Json<UserLookupResponse>, ApiError> {
    user.sub()?;
    let found_user = user::Entity::find()
        .filter(
            user::Column::Id
                .eq(&query)
                .or(user::Column::Email.eq(&query))
                .or(user::Column::Username.eq(&query)),
        )
        .one(&state.db)
        .await?;
    if let Some(user_info) = found_user {
        let response = UserLookupResponse::from(user_info);
        return Ok(Json(response));
    }

    Err(anyhow!("User not found").into())
}
