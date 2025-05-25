use axum::extract::Query;
use axum::http::StatusCode;
use axum::{
    extract::Path,
    response::Json,
    routing::{get, post},
    Router,
};
use flow_like_api::construct_router;
use flow_like_types::tokio;
use lambda_http::{run_with_streaming_response, tracing, Error};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::env::set_var;
use std::sync::Arc;
use tracing_subscriber::prelude::*;

#[flow_like_types::tokio::main]
async fn main() -> Result<(), Error> {
    let sentry_endpoint = std::env::var("SENTRY_ENDPOINT").unwrap_or_default();

    let _sentry_guard = if sentry_endpoint.is_empty() {
        tracing::init_default_subscriber();
        None
    } else {
        let guard = sentry::init((
            sentry_endpoint,
            sentry::ClientOptions {
                release: sentry::release_name!(),
                traces_sample_rate: 0.3,
                ..Default::default()
            },
        ));
        tracing_subscriber::registry()
            .with(tracing_subscriber::fmt::layer())
            .with(sentry_tracing::layer())
            .init();
        Some(guard)
    };

    let state = Arc::new(flow_like_api::state::State::new().await);
    let app = construct_router(state);

    run_with_streaming_response(app).await
}
