use crate::{entity::user, error::ApiError, middleware::jwt::AppUser, state::AppState};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like::hub::Lookup;
use flow_like_types::Value;
use flow_like_types::anyhow;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, sqlx::types::chrono};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UserLookupResponse {
    id: String,
    email: Option<String>,
    username: Option<String>,
    name: Option<String>,
    avatar_url: Option<String>,
    additional_information: Option<Value>,
    description: Option<String>,
    created_at: Option<chrono::NaiveDateTime>,
}

impl UserLookupResponse {
    fn parse(user: user::Model, lookup_config: Lookup) -> Self {
        UserLookupResponse {
            id: user.id,
            email: lookup_config.email.then(|| user.email).flatten(),
            username: lookup_config.username.then(|| user.username).flatten(),
            name: lookup_config.name.then(|| user.name).flatten(),
            avatar_url: lookup_config.avatar.then(|| user.avatar_url).flatten(),
            additional_information: lookup_config
                .additional_information
                .then(|| user.additional_information)
                .flatten(),
            description: lookup_config
                .description
                .then(|| user.description)
                .flatten(),
            created_at: lookup_config.created_at.then_some(user.created_at),
        }
    }
}

#[tracing::instrument(name = "GET /user/lookup/{query}", skip(state, user))]
pub async fn user_lookup(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(query): Path<String>,
) -> Result<Json<UserLookupResponse>, ApiError> {
    user.sub()?;
    let lookup_config = state.platform_config.lookup.clone();
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
        let response = UserLookupResponse::parse(user_info, lookup_config);
        return Ok(Json(response));
    }

    Err(ApiError::NotFound)
}
