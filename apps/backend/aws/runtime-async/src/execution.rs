use lambda_runtime::tracing::{self, instrument};

#[instrument(skip(body))]
pub async fn execute(body: &str) -> flow_like_types::Result<()> {
    Ok(())
}
