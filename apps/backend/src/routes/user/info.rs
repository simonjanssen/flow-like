use std::collections::HashMap;

use crate::{
    entity::{pat, prelude::*, technical_user, user},
    error::ApiError,
    middleware::jwt::AppUser,
    state::AppState,
};
use axum::{extract::State, Extension, Json};
use flow_like_types::anyhow;
use sea_orm::{sqlx::types::chrono, ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter};

#[tracing::instrument(skip(state))]
pub async fn user_info(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
) -> Result<Json<user::Model>, ApiError> {
    let sub = user.sub()?;
    let email = user.email().clone();
    let username = user.username().clone();
    let user_info = user::Entity::find_by_id(&sub).one(&state.db).await?;
    if let Some(user_info) = user_info {
        if let Some(email) = &email {
            if user_info.email != Some(email.clone()) {
                let mut updated_user: user::ActiveModel = user_info.clone().into();
                updated_user.email = sea_orm::ActiveValue::Set(Some(email.clone()));
                updated_user.updated_at = sea_orm::ActiveValue::Set(chrono::Utc::now().naive_utc());
                updated_user.update(&state.db).await?;
            }
        }

        if user_info.stripe_id.is_none() && state.platform_config.features.premium {
            let stripe_customer = generate_stripe_user(&state, &sub, email.clone()).await?;
            let mut updated_user: user::ActiveModel = user_info.clone().into();
            updated_user.stripe_id =
                sea_orm::ActiveValue::Set(Some(stripe_customer.id.to_string()));
            updated_user.updated_at = sea_orm::ActiveValue::Set(chrono::Utc::now().naive_utc());
            updated_user.update(&state.db).await?;
        }

        return Ok(Json(user_info));
    }

    let stripe_customer = if state.platform_config.features.premium {
        Some(
            generate_stripe_user(&state, &sub, email.clone())
                .await?
                .id
                .to_string(),
        )
    } else {
        None
    };

    let user = user::ActiveModel {
        id: sea_orm::ActiveValue::Set(sub.clone()),
        email: sea_orm::ActiveValue::Set(email),
        stripe_id: sea_orm::ActiveValue::Set(stripe_customer),
        username: sea_orm::ActiveValue::Set(username),
        created_at: sea_orm::ActiveValue::Set(chrono::Utc::now().naive_utc()),
        updated_at: sea_orm::ActiveValue::Set(chrono::Utc::now().naive_utc()),
        ..Default::default()
    };

    let new_user = user::Entity::insert(user)
        .exec_with_returning(&state.db)
        .await?;

    Ok(Json(new_user))
}

async fn generate_stripe_user(
    state: &AppState,
    sub: &str,
    email: Option<String>,
) -> flow_like_types::Result<stripe::Customer> {
    let stripe_client = state
        .stripe_client
        .as_ref()
        .ok_or(anyhow!("Premium Feature disabled"))?;
    let customer = stripe::Customer::create(
        stripe_client,
        stripe::CreateCustomer {
            metadata: Some(HashMap::from([
                ("sub".to_string(), sub.to_string()),
                ("platform".to_string(), "FlowLike".to_string()),
            ])),
            email: email.as_ref().map(String::as_str),
            ..Default::default()
        },
    )
    .await?;

    Ok(customer)
}
