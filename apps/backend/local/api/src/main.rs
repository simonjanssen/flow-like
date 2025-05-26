use dotenv::dotenv;
use flow_like_api::axum;
use flow_like_api::construct_router;
use flow_like_types::tokio;
use socket2::{Domain, Socket, Type};
use std::{
    io,
    net::{SocketAddr, ToSocketAddrs},
    sync::Arc,
    time::Duration,
};
use tracing_subscriber::prelude::*;

#[flow_like_types::tokio::main]
async fn main() {
    dotenv().ok();

    let sentry_endpoint = std::env::var("SENTRY_ENDPOINT").unwrap_or_default();

    let _sentry_guard = if sentry_endpoint.is_empty() {
        tracing_subscriber::registry()
            .with(tracing_subscriber::fmt::layer())
            .init();
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

    let content_store = std::env::var("CONTENT_BUCKET_NAME").unwrap();
    let meta_store = std::env::var("META_BUCKET_NAME").unwrap();

    let content_store = flow_like_storage::object_store::aws::AmazonS3Builder::from_env()
        .with_bucket_name(content_store)
        .build()
        .unwrap();
    let content_store =
        flow_like_storage::files::store::FlowLikeStore::AWS(Arc::new(content_store));

    let meta_store = flow_like_storage::object_store::aws::AmazonS3Builder::from_env()
        .with_bucket_name(meta_store)
        .with_s3_express(true)
        .build()
        .unwrap();
    let meta_store = flow_like_storage::files::store::FlowLikeStore::AWS(Arc::new(meta_store));

    let state = Arc::new(flow_like_api::state::State::new(content_store, meta_store).await);

    let app = construct_router(state);

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
