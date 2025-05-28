use std::sync::Arc;

use axum::{Router, middleware::from_fn_with_state, routing::get};
use middleware::jwt::jwt_middleware;
use state::State;
use tower::ServiceBuilder;
use tower_http::{
    compression::{CompressionLayer, DefaultPredicate, Predicate, predicate::NotForContentType},
    cors::CorsLayer,
    decompression::RequestDecompressionLayer,
};

mod entity;
mod middleware;
mod routes;

pub mod credentials;
pub mod error;
pub mod permission;
pub mod state;

pub use axum;
pub mod auth {
    use crate::middleware;
    pub use middleware::jwt::AppUser;
}

pub fn construct_router(state: Arc<State>) -> Router {
    let router = Router::new()
        .nest("/health", routes::health::routes())
        .nest("/info", routes::info::routes())
        .nest("/user", routes::user::routes())
        .nest("/profile", routes::profile::routes())
        .nest("/app", routes::app::routes())
        .nest("/bit", routes::bit::routes())
        .nest("/store", routes::store::routes())
        .nest("/auth", routes::auth::routes())
        .with_state(state.clone())
        .route("/version", get(|| async { "0.0.0" }))
        .layer(from_fn_with_state(state.clone(), jwt_middleware))
        .layer(CorsLayer::permissive())
        .layer(
            ServiceBuilder::new()
                .layer(RequestDecompressionLayer::new())
                .layer(CompressionLayer::new().compress_when(
                    DefaultPredicate::new().and(NotForContentType::new("text/event-stream")),
                )),
        );

    Router::new().nest("/api/v1", router)
}
