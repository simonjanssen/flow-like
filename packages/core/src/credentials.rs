use aws_credentials::AwsSharedCredentials;
use flow_like_storage::files::store::FlowLikeStore;
use flow_like_storage::lancedb::connection::ConnectBuilder;
use flow_like_storage::object_store;
use flow_like_types::Result;
use flow_like_types::async_trait;
use serde::{Deserialize, Serialize};
pub mod aws_credentials;

#[async_trait]
pub trait SharedCredentialsTrait {
    async fn to_store(&self, meta: bool) -> Result<FlowLikeStore>;
    async fn to_db(&self, path: object_store::path::Path) -> Result<ConnectBuilder>;
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum SharedCredentials {
    Aws(AwsSharedCredentials),
}

impl SharedCredentials {
    pub async fn to_store(&self, meta: bool) -> Result<FlowLikeStore> {
        match self {
            SharedCredentials::Aws(aws) => aws.to_store(meta).await,
        }
    }

    pub async fn to_db(&self, path: object_store::path::Path) -> Result<ConnectBuilder> {
        match self {
            SharedCredentials::Aws(aws) => aws.to_db(path).await,
        }
    }
}
