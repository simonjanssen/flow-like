use crate::error::AppError;
use crate::state::AppState;
use axum::Json;
use axum::extract::State;
use axum::{Router, routing::get};
use flow_like_types::Value;
use serde_json::json;
use std::time::Instant;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(health))
        .route("/db", get(db_health))
}

#[tracing::instrument(name = "GET /health")]
async fn health() -> Result<Json<Value>, AppError> {
    let response = Json(json!({
        "status": "ok",
    }));
    Ok(response)
}

#[tracing::instrument(name = "GET /health/db", skip(state))]
async fn db_health(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let state = state.db.clone();
    let now = Instant::now();
    state.ping().await?;
    let elapsed = now.elapsed();
    let response = Json(json!({
        "rtt": elapsed.as_millis(),
    }));
    Ok(response)
}
