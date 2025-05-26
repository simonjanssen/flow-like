use flow_like_api::construct_router;
use flow_like_types::tokio;
use lambda_http::{Error, run_with_streaming_response, tracing};
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

    tracing::info!("Starting FlowLike API...");

    let content_store = std::env::var("CONTENT_BUCKET_NAME")?;
    let meta_store = std::env::var("META_BUCKET_NAME")?;

    let content_store = flow_like_storage::object_store::aws::AmazonS3Builder::from_env()
        .with_bucket_name(content_store)
        .build()?;
    let content_store =
        flow_like_storage::files::store::FlowLikeStore::AWS(Arc::new(content_store));

    let meta_store = flow_like_storage::object_store::aws::AmazonS3Builder::from_env()
        .with_bucket_name(meta_store)
        .with_s3_express(true)
        .build()?;
    let meta_store = flow_like_storage::files::store::FlowLikeStore::AWS(Arc::new(meta_store));

    let state = Arc::new(flow_like_api::state::State::new(content_store, meta_store).await);
    let app = construct_router(state);

    run_with_streaming_response(app).await
}
