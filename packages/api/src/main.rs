use axum::{middleware::from_fn_with_state, routing::get, Extension, Json, Router};
use dotenv::dotenv;
use error::{ApiError, AppError};
use flow_like_types::tokio;
use middleware::jwt::jwt_middleware;
use socket2::{Domain, Socket, Type};
use std::{
    io,
    net::{SocketAddr, ToSocketAddrs},
    sync::Arc,
    time::Duration,
};
use tower::ServiceBuilder;
use tower_http::{
    compression::{predicate::NotForContentType, CompressionLayer, DefaultPredicate, Predicate},
    cors::CorsLayer,
    decompression::RequestDecompressionLayer,
};
use tracing_subscriber::prelude::*;

mod entity;
mod error;
mod middleware;
mod routes;
mod state;

#[flow_like_types::tokio::main]
async fn main() {
    dotenv().ok();

    let sentry_endpoint = std::env::var("SENTRY_ENDPOINT").unwrap_or("".to_string());
    let _guard = sentry::init((
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

    let state = Arc::new(state::State::new().await);

    let app: Router = Router::new()
        .nest("/health", routes::health::routes())
        .nest("/info", routes::info::routes())
        .nest("/user", routes::user::routes())
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

    let port = 3210;
    let listener = match create_listener(format!("0.0.0.0:{}", port)) {
        Ok(listener) => listener,
        Err(err) => {
            eprintln!("Failed to bind to port {}: {:?}", port, err);
            return;
        }
    };
    axum::serve(listener, app).await.unwrap();
}

fn create_listener<A: ToSocketAddrs>(
    addr: A,
) -> io::Result<flow_like_types::tokio::net::TcpListener> {
    let mut addrs = addr.to_socket_addrs()?;
    let addr = addrs.next().unwrap();
    let listener = match &addr {
        SocketAddr::V4(_) => Socket::new(Domain::IPV4, Type::STREAM, None)?,
        SocketAddr::V6(_) => Socket::new(Domain::IPV6, Type::STREAM, None)?,
    };

    listener.set_nonblocking(true)?;
    listener.set_nodelay(true)?;
    listener.set_reuse_address(true)?;
    listener.set_linger(Some(Duration::from_secs(0)))?;
    listener.bind(&addr.into())?;
    listener.listen(i32::MAX)?;

    let listener = std::net::TcpListener::from(listener);
    let listener = flow_like_types::tokio::net::TcpListener::from_std(listener)?;
    Ok(listener)
}
