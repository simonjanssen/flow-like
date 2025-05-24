use crate::{
    entity::{pat, prelude::*, technical_user},
    error::AuthorizationError,
};
use axum::{
    body::Body,
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use flow_like_types::anyhow;
use flow_like_types::bail;
use flow_like_types::Result;
use hyper::{header::AUTHORIZATION, StatusCode};
use sea_orm::{sqlx::types::chrono, ColumnTrait, EntityTrait, QueryFilter};

use crate::state::AppState;

#[derive(Debug, Clone)]
pub struct OpenIDUser {
    pub sub: String,
    pub username: String,
    pub email: Option<String>,
}

#[derive(Debug, Clone)]
pub struct PATUser {
    pub pat: String,
    pub sub: String,
}

#[derive(Debug, Clone)]
pub struct ApiKey {
    pub api_key: String,
    pub app_id: String,
}

#[derive(Debug, Clone)]
pub enum AppUser {
    OpenID(OpenIDUser),
    PAT(PATUser),
    APIKey(ApiKey),
    Unauthorized,
}

impl AppUser {
    pub fn sub(&self) -> Result<String, AuthorizationError> {
        match self {
            AppUser::OpenID(user) => Ok(user.sub.clone()),
            AppUser::PAT(user) => Ok(user.sub.clone()),
            AppUser::APIKey(_) => Err(AuthorizationError::from(anyhow!(
                "APIKey user does not have a sub"
            ))),
            AppUser::Unauthorized => Err(AuthorizationError::from(anyhow!(
                "Unauthorized user does not have a sub"
            ))),
        }
    }

    pub fn email(&self) -> Option<String> {
        match self {
            AppUser::OpenID(user) => user.email.clone(),
            AppUser::PAT(_) => None,
            AppUser::APIKey(_) => None,
            AppUser::Unauthorized => None,
        }
    }

    pub fn username(&self) -> Option<String> {
        match self {
            AppUser::OpenID(user) => Some(user.username.clone()),
            AppUser::PAT(_) => None,
            AppUser::APIKey(_) => None,
            AppUser::Unauthorized => None,
        }
    }

    pub fn app_permission(&self, app_id: &str) -> Result<String> {
        unimplemented!()
    }
}

pub async fn jwt_middleware(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response<Body>, AuthorizationError> {
    let mut request = request;
    if let Some(auth_header) = request.headers().get(AUTHORIZATION) {
        if let Ok(token) = auth_header.to_str() {
            let token = if token.starts_with("Bearer ") {
                &token[7..]
            } else {
                token
            };

            let token = token.trim();
            let claims = state.validate_token(token)?;
            let sub = claims.get("sub").ok_or(anyhow!("sub not found"))?;
            let sub = sub.as_str().ok_or(anyhow!("sub not a string"))?;
            let email = claims
                .get("email")
                .and_then(|v| v.as_str())
                .map(String::from);
            let username = claims
                .get("username")
                .and_then(|v| v.as_str())
                .map(String::from)
                .or_else(|| {
                    claims
                        .get("cognito:username")
                        .and_then(|v| v.as_str())
                        .map(String::from)
                })
                .unwrap_or_else(|| sub.to_string());
            let user = AppUser::OpenID(OpenIDUser {
                sub: sub.to_string(),
                username: username,
                email,
            });
            request.extensions_mut().insert::<AppUser>(user);
            return Ok(next.run(request).await);
        }
    }

    if let Some(pat_header) = request.headers().get("x-pat") {
        if let Ok(pat_str) = pat_header.to_str() {
            let db_pat = Pat::find()
                .filter(pat::Column::Key.eq(pat_str))
                .one(&state.db)
                .await?;
            if let Some(pat) = db_pat {
                let pat_user = AppUser::PAT(PATUser {
                    pat: pat_str.to_string(),
                    sub: pat.user_id.clone(),
                });
                request.extensions_mut().insert::<AppUser>(pat_user);
                return Ok(next.run(request).await);
            }
        }
    }

    if let Some(api_key_header) = request.headers().get("x-api-key") {
        if let Ok(api_key_str) = api_key_header.to_str() {
            let db_app = TechnicalUser::find()
                .filter(technical_user::Column::Key.eq(api_key_str))
                .one(&state.db)
                .await?;

            if let Some(app) = db_app {
                if let Some(valid_until) = app.valid_until {
                    let now = chrono::Utc::now().naive_utc();
                    if valid_until < now {
                        return Err(AuthorizationError::from(anyhow!("API Key is expired")));
                    }
                }

                let app_user = AppUser::APIKey(ApiKey {
                    api_key: api_key_str.to_string(),
                    app_id: app.id.clone(),
                });
                request.extensions_mut().insert::<AppUser>(app_user);
                return Ok(next.run(request).await);
            }
        }
    }

    request
        .extensions_mut()
        .insert::<AppUser>(AppUser::Unauthorized);
    return Ok(next.run(request).await);
}
