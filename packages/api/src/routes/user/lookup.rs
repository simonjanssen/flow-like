use crate::{entity::user, error::ApiError, middleware::jwt::AppUser, state::AppState};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like::hub::Lookup;
use flow_like_types::Value;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QuerySelect, sqlx::types::chrono};
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
            email: lookup_config.email.then_some(user.email).flatten(),
            username: lookup_config.username.then_some(user.username).flatten(),
            name: lookup_config.name.then_some(user.name).flatten(),
            avatar_url: lookup_config.avatar.then_some(user.avatar_url).flatten(),
            additional_information: lookup_config
                .additional_information
                .then_some(user.additional_information)
                .flatten(),
            description: lookup_config
                .description
                .then_some(user.description)
                .flatten(),
            created_at: lookup_config.created_at.then_some(user.created_at),
        }
    }
}

#[tracing::instrument(name = "GET /user/lookup/{sub}", skip(state, user))]
pub async fn user_lookup(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(sub): Path<String>,
) -> Result<Json<UserLookupResponse>, ApiError> {
    user.sub()?;
    let lookup_config = state.platform_config.lookup.clone();
    let found_user = user::Entity::find()
        .filter(user::Column::Id.eq(&sub))
        .one(&state.db)
        .await?;

    if let Some(user_info) = found_user {
        let response = UserLookupResponse::parse(user_info, lookup_config);
        return Ok(Json(response));
    }

    Err(ApiError::NotFound)
}

#[tracing::instrument(name = "GET /user/search/{query}", skip(state, user))]
pub async fn user_search(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(query): Path<String>,
) -> Result<Json<Vec<UserLookupResponse>>, ApiError> {
    user.sub()?;
    let lookup_config = state.platform_config.lookup.clone();

    // First try exact matches
    let exact_matches = user::Entity::find()
        .filter(
            user::Column::Id
                .eq(&query)
                .or(user::Column::Email.eq(&query))
                .or(user::Column::Username.eq(&query)),
        )
        .all(&state.db)
        .await?;

    if !exact_matches.is_empty() {
        let responses: Vec<UserLookupResponse> = exact_matches
            .into_iter()
            .map(|user_info| UserLookupResponse::parse(user_info, lookup_config.clone()))
            .collect();
        return Ok(Json(responses));
    }

    // If no exact matches, try fuzzy search
    let fuzzy_query = format!("%{}%", query);
    let fuzzy_matches = user::Entity::find()
        .filter(
            user::Column::Username
                .like(&fuzzy_query)
                .or(user::Column::Name.like(&fuzzy_query))
                .or(user::Column::Email.like(&fuzzy_query)),
        )
        .limit(10)
        .all(&state.db)
        .await?;

    if fuzzy_matches.is_empty() {
        return Err(ApiError::NotFound);
    }

    let responses: Vec<UserLookupResponse> = fuzzy_matches
        .into_iter()
        .map(|user_info| UserLookupResponse::parse(user_info, lookup_config.clone()))
        .collect();

    Ok(Json(responses))
}
