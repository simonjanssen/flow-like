use aws_credentials::AwsRuntimeCredentials;
use flow_like::flow_like_storage::files::store::FlowLikeStore;
use flow_like::state::FlowLikeState;
use flow_like_types::Result;
use flow_like_types::async_trait;
use serde::{Deserialize, Serialize};

use crate::state::AppState;
use crate::state::State;

pub mod aws_credentials;

#[async_trait]
pub trait RuntimeCredentialsTrait {
    async fn to_store(&self, meta: bool) -> Result<FlowLikeStore>;
    async fn to_state(&self, state: AppState) -> Result<FlowLikeState>;
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RuntimeCredentials {
    #[cfg(feature = "aws")]
    Aws(AwsRuntimeCredentials),
}

impl RuntimeCredentials {
    pub async fn scoped(sub: &str, app_id: &str, state: &State) -> Result<Self> {
        #[cfg(feature = "aws")]
        return Ok(RuntimeCredentials::Aws(
            AwsRuntimeCredentials::from_env()
                .scoped_credentials(sub, app_id, state)
                .await?,
        ));

        Err(flow_like_types::anyhow!(
            "No runtime credentials available for this environment"
        ))
    }

    pub async fn master_credentials() -> Result<Self> {
        #[cfg(feature = "aws")]
        return Ok(RuntimeCredentials::Aws(
            AwsRuntimeCredentials::from_env().master_credentials().await,
        ));

        Err(flow_like_types::anyhow!(
            "No runtime credentials available for this environment"
        ))
    }

    pub async fn to_store(&self, meta: bool) -> Result<FlowLikeStore> {
        match self {
            #[cfg(feature = "aws")]
            RuntimeCredentials::Aws(aws) => aws.to_store(meta).await,
        }
    }

    pub async fn to_state(&self, state: AppState) -> Result<FlowLikeState> {
        match self {
            #[cfg(feature = "aws")]
            RuntimeCredentials::Aws(aws) => aws.to_state(state).await,
        }
    }
}
