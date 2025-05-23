use crate::entity::{pat, prelude::*, technical_user};
use anyhow::bail;
use axum::{
    body::Body,
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use flow_like_types::Result;
use hyper::{header::AUTHORIZATION, StatusCode};
use sea_orm::{sqlx::types::chrono, ColumnTrait, EntityTrait, QueryFilter};

use crate::state::AppState;

#[derive(Debug, Clone)]
pub struct OpenIDUser {
    pub sub: String,
    pub email: Option<String>,
}

#[derive(Debug, Clone)]
pub struct PATUser {
    pub pat: String,
    pub sub: String,
}

#[derive(Debug, Clone)]
pub struct AppUser {
    pub api_key: String,
    pub app_id: String,
}

#[derive(Debug, Clone)]
pub enum AuthorizedUser {
    OpenID(OpenIDUser),
    PAT(PATUser),
    APIKey(AppUser),
}

impl AuthorizedUser {
    pub fn sub(&self) -> Result<String> {
        match self {
            AuthorizedUser::OpenID(user) => Ok(user.sub.clone()),
            AuthorizedUser::PAT(user) => Ok(user.sub.clone()),
            AuthorizedUser::APIKey(_) => bail!("APIKey user does not have a sub"),
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
) -> Result<Response<Body>, StatusCode> {
    let mut request = request;
    if let Some(auth_header) = request.headers().get(AUTHORIZATION) {
        if let Ok(token) = auth_header.to_str() {
            let token = if token.starts_with("Bearer ") {
                &token[7..]
            } else {
                token
            };

            let token = token.trim();
            let claims = state
                .validate_token(token)
                .map_err(|_| StatusCode::UNAUTHORIZED)?;
            let sub = claims.get("sub").ok_or(StatusCode::UNAUTHORIZED)?;
            let email = claims
                .get("email")
                .and_then(|v| v.as_str())
                .map(String::from);
            let sub = sub.as_str().ok_or(StatusCode::UNAUTHORIZED)?;
            let user = AuthorizedUser::OpenID(OpenIDUser {
                sub: sub.to_string(),
                email,
            });
            request.extensions_mut().insert::<AuthorizedUser>(user);
            return Ok(next.run(request).await);
        }
    }

    if let Some(pat_header) = request.headers().get("x-pat") {
        if let Ok(pat_str) = pat_header.to_str() {
            let db_pat = Pat::find()
                .filter(pat::Column::Key.eq(pat_str))
                .one(&state.db)
                .await
                .map_err(|_| StatusCode::UNAUTHORIZED)?;
            if let Some(pat) = db_pat {
                let pat_user = AuthorizedUser::PAT(PATUser {
                    pat: pat_str.to_string(),
                    sub: pat.user_id.clone(),
                });
                request.extensions_mut().insert::<AuthorizedUser>(pat_user);
                return Ok(next.run(request).await);
            }
        }
    }

    if let Some(api_key_header) = request.headers().get("x-api-key") {
        if let Ok(api_key_str) = api_key_header.to_str() {
            let db_app = TechnicalUser::find()
                .filter(technical_user::Column::Key.eq(api_key_str))
                .one(&state.db)
                .await
                .map_err(|_| StatusCode::UNAUTHORIZED)?;

            if let Some(app) = db_app {
                if let Some(valid_until) = app.valid_until {
                    let now = chrono::Utc::now().naive_utc();
                    if valid_until < now {
                        return Err(StatusCode::UNAUTHORIZED);
                    }
                }

                let app_user = AuthorizedUser::APIKey(AppUser {
                    api_key: api_key_str.to_string(),
                    app_id: app.id.clone(),
                });
                request.extensions_mut().insert::<AuthorizedUser>(app_user);
                return Ok(next.run(request).await);
            }
        }
    }

    Err(StatusCode::UNAUTHORIZED)
}
