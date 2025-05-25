use axum::Json;
use axum::body::Body;
use axum::extract::State;
use axum::response::{IntoResponse, Redirect};
use axum::routing::post;
use axum::{Router, http::Request, routing::get};
use flow_like_types::anyhow;
use hyper::Uri;

use crate::error::AppError;
use crate::state::{AppState, OpenIdConfig};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/discovery", get(discovery))
        .route("/jwks", get(jwks))
        .route("/authorize", get(proxy_authorize).post(proxy_authorize))
        .route("/token", post(proxy_token))
        .route("/userinfo", get(proxy_userinfo).post(proxy_userinfo))
        .route("/revoke", get(proxy_revoke).post(proxy_revoke))
        .route("/openid", get(openid_config))
}

#[tracing::instrument(name = "GET /auth/openid", skip(state))]
async fn openid_config(State(state): State<AppState>) -> Result<Json<OpenIdConfig>, AppError> {
    let config = state
        .platform_config
        .authentication
        .as_ref()
        .unwrap()
        .openid
        .as_ref()
        .unwrap()
        .clone();

    Ok(Json(config))
}

#[tracing::instrument(name = "GET /auth/discovery", skip(state))]
async fn discovery(State(state): State<AppState>) -> Redirect {
    Redirect::temporary(
        &state
            .platform_config
            .authentication
            .as_ref()
            .unwrap()
            .openid
            .as_ref()
            .unwrap()
            .discovery_url
            .clone()
            .unwrap()
            .clone(),
    )
}

#[tracing::instrument(name = "GET /auth/jwks", skip(state))]
async fn jwks(State(state): State<AppState>) -> Redirect {
    Redirect::temporary(
        &state
            .platform_config
            .authentication
            .as_ref()
            .unwrap()
            .openid
            .as_ref()
            .unwrap()
            .jwks_url,
    )
}

#[tracing::instrument(name = "GET /auth/authorize (proxy)", skip(state))]
async fn proxy_authorize(
    State(state): State<AppState>,
    req: Request<Body>,
) -> Result<impl IntoResponse, AppError> {
    proxy_request(state, req, "authorize").await
}

#[tracing::instrument(name = "GET /auth/token (proxy)", skip(state))]
async fn proxy_token(
    State(state): State<AppState>,
    req: Request<Body>,
) -> Result<impl IntoResponse, AppError> {
    proxy_request(state, req, "token").await
}

#[tracing::instrument(name = "GET /auth/userinfo (proxy)", skip(state))]
async fn proxy_userinfo(
    State(state): State<AppState>,
    req: Request<Body>,
) -> Result<impl IntoResponse, AppError> {
    proxy_request(state, req, "userinfo").await
}

#[tracing::instrument(name = "GET /auth/revoke (proxy)", skip(state))]
async fn proxy_revoke(
    State(state): State<AppState>,
    req: Request<Body>,
) -> Result<impl IntoResponse, AppError> {
    proxy_request(state, req, "revoke").await
}

#[tracing::instrument(skip(state))]
async fn proxy_request(
    state: AppState,
    mut req: Request<Body>,
    endpoint: &str,
) -> Result<impl IntoResponse, AppError> {
    let client = state.client.clone();

    let openid_config = state
        .platform_config
        .authentication
        .as_ref()
        .unwrap()
        .openid
        .as_ref()
        .ok_or(anyhow!("OpenID Configuration Error"))?;

    let proxy = openid_config.proxy.clone().ok_or(anyhow!("Proxy Error"))?;

    let url = match endpoint {
        "authorize" => proxy.authorize.clone(),
        "token" => proxy.token.clone(),
        "userinfo" => proxy.userinfo.clone(),
        "revoke" => proxy.revoke.clone(),
        _ => return Err(AppError::from(anyhow!("Invalid endpoint"))),
    }
    .ok_or(anyhow!("Invalid endpoint"))?;

    *req.uri_mut() = Uri::try_from(&url).unwrap();

    Ok(client
        .request(req)
        .await
        .map_err(|_| anyhow!("Bad Request"))?
        .into_response())
}
