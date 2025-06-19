use crate::state::{AppState, State};
use flow_like::{
    flow_like_storage::{
        files::store::FlowLikeStore,
        lancedb::{connect, connection::ConnectBuilder},
        object_store::{self, aws::AmazonS3Builder},
    },
    state::{FlowLikeConfig, FlowLikeState},
    utils::http::HTTPClient,
};
use flow_like_types::{Result, anyhow, async_trait};
use serde::{Deserialize, Serialize};
use serde_json::{json, to_string};
use std::sync::Arc;

use super::RuntimeCredentialsTrait;

#[cfg(feature = "aws")]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AwsRuntimeCredentials {
    pub access_key_id: Option<String>,
    pub secret_access_key: Option<String>,
    pub session_token: Option<String>,
    pub meta_bucket: String,
    pub content_bucket: String,
    pub region: String,
}

#[cfg(feature = "aws")]
impl From<aws_sdk_sts::types::Credentials> for AwsRuntimeCredentials {
    fn from(credentials: aws_sdk_sts::types::Credentials) -> Self {
        AwsRuntimeCredentials {
            access_key_id: Some(credentials.access_key_id),
            secret_access_key: Some(credentials.secret_access_key),
            session_token: Some(credentials.session_token),
            meta_bucket: std::env::var("META_BUCKET_NAME").unwrap_or_default(),
            content_bucket: std::env::var("CONTENT_BUCKET_NAME").unwrap_or_default(),
            region: std::env::var("AWS_REGION").unwrap_or_else(|_| "us-east-1".to_string()),
        }
    }
}

#[cfg(feature = "aws")]
impl AwsRuntimeCredentials {
    pub fn new(meta_bucket: &str, content_bucket: &str, region: &str) -> Self {
        AwsRuntimeCredentials {
            access_key_id: None,
            secret_access_key: None,
            session_token: None,
            meta_bucket: meta_bucket.to_string(),
            content_bucket: content_bucket.to_string(),
            region: region.to_string(),
        }
    }

    pub fn from_env() -> Self {
        AwsRuntimeCredentials {
            access_key_id: std::env::var("AWS_ACCESS_KEY_ID").ok(),
            secret_access_key: std::env::var("AWS_SECRET_ACCESS_KEY").ok(),
            session_token: std::env::var("AWS_SESSION_TOKEN").ok(),
            meta_bucket: std::env::var("META_BUCKET_NAME").unwrap_or_default(),
            content_bucket: std::env::var("CONTENT_BUCKET_NAME").unwrap_or_default(),
            region: std::env::var("AWS_REGION").unwrap_or_else(|_| "us-east-1".to_string()),
        }
    }

    pub async fn master_credentials(&self) -> Self {
        AwsRuntimeCredentials {
            access_key_id: std::env::var("AWS_ACCESS_KEY_ID").ok(),
            secret_access_key: std::env::var("AWS_SECRET_ACCESS_KEY").ok(),
            session_token: std::env::var("AWS_SESSION_TOKEN").ok(),
            meta_bucket: self.meta_bucket.clone(),
            content_bucket: self.content_bucket.clone(),
            region: self.region.clone(),
        }
    }

    pub async fn scoped_credentials(&self, sub: &str, app_id: &str, state: &State) -> Result<Self> {
        if sub.is_empty() || app_id.is_empty() {
            return Err(flow_like_types::anyhow!("Sub or App ID cannot be empty"));
        }

        let role = std::env::var("RUNTIME_ROLE_ARN").map_err(|_| {
            flow_like_types::anyhow!("RUNTIME_ROLE_ARN environment variable not set")
        })?;

        let client = aws_sdk_sts::Client::new(&state.aws_client);

        let apps_prefix = format!("boards/{}/{}", sub, app_id);
        let user_prefix = format!("boards/{}/{}", sub, app_id);
        let log_prefix = format!("logs/{}/{}", sub, app_id);
        let temporary_prefix = format!("temporary/{}/{}", sub, app_id);

        let policy = json!({
            "Version": "2012-10-17",
            "Statement": [
              {
                "Effect": "Allow",
                "Action": [
                    "s3:ListBucket"
                ],
                "Resource": [
                    format!("arn:aws:s3:::{}", self.meta_bucket),
                    format!("arn:aws:s3:::{}", self.content_bucket)
                ],
                "Condition": {
                    "StringLike": {
                        "s3:prefix": [
                            format!("{}/*", apps_prefix),
                            format!("{}/*", user_prefix),
                            format!("{}/*", log_prefix),
                            format!("{}/*", temporary_prefix)
                        ]
                    }
                }
              },
              {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject"
                ],
                "Resource": [
                    format!("arn:aws:s3:::{}/{}/*", self.content_bucket, apps_prefix),
                    format!("arn:aws:s3:::{}/{}/*", self.content_bucket, user_prefix),
                    format!("arn:aws:s3:::{}/{}/*", self.content_bucket, log_prefix),
                    format!("arn:aws:s3:::{}/{}/*", self.content_bucket, temporary_prefix),
                    format!("arn:aws:s3express:::{}/{}/*", self.meta_bucket, apps_prefix),
                ],
              },
              {
                "Effect": "Allow",
                "Action": [
                    "s3express:CreateSesssion",
                ],
                "Resource": [
                    "*"
                ]
              }
            ],
        });
        let policy = to_string(&policy)
            .map_err(|e| flow_like_types::anyhow!("Failed to serialize policy: {}", e))?;

        let credentials = client
            .assume_role()
            .role_arn(role)
            .role_session_name(format!("{}-{}", sub, app_id))
            .policy(policy)
            .duration_seconds(3600) // 1 hour
            .send()
            .await?;

        Ok(Self {
            access_key_id: credentials
                .credentials()
                .map(|c| c.access_key_id().to_string()),
            secret_access_key: credentials
                .credentials()
                .map(|c| c.secret_access_key().to_string()),
            session_token: credentials
                .credentials()
                .map(|c| c.session_token().to_string()),
            meta_bucket: self.meta_bucket.clone(),
            content_bucket: self.content_bucket.clone(),
            region: self.region.clone(),
        })
    }
}

#[cfg(feature = "aws")]
#[async_trait]
impl RuntimeCredentialsTrait for AwsRuntimeCredentials {
    async fn to_store(&self, meta: bool) -> Result<FlowLikeStore> {
        let mut builder = AmazonS3Builder::new()
            .with_access_key_id(
                self.access_key_id
                    .clone()
                    .ok_or(anyhow!("AWS_ACCESS_KEY_ID is not set"))?,
            )
            .with_secret_access_key(
                self.secret_access_key
                    .clone()
                    .ok_or(anyhow!("AWS_SECRET_ACCESS_KEY is not set"))?,
            )
            .with_token(
                self.session_token
                    .clone()
                    .ok_or(anyhow!("SESSION TOKEN is not set"))?,
            )
            .with_bucket_name(if meta {
                &self.meta_bucket
            } else {
                &self.content_bucket
            })
            .with_region(&self.region);

        if meta {
            builder = builder.with_s3_express(true);
        }

        let store = builder.build()?;
        Ok(FlowLikeStore::AWS(Arc::new(store)))
    }

    async fn to_state(&self, state: AppState) -> Result<FlowLikeState> {
        let meta_store = self.to_store(true).await?;
        let content_store = self.to_store(false).await?;

        let mut config = FlowLikeConfig::with_default_store(content_store);
        config.register_app_meta_store(meta_store.clone());

        let (bkt, key, secret, token) = (
            self.content_bucket.clone(),
            self.access_key_id
                .clone()
                .ok_or(anyhow!("AWS_ACCESS_KEY_ID is not set"))?,
            self.secret_access_key
                .clone()
                .ok_or(anyhow!("AWS_SECRET_ACCESS_KEY is not set"))?,
            self.session_token
                .clone()
                .ok_or(anyhow!("SESSION_TOKEN is not set"))?,
        );

        config.register_build_logs_database(Arc::new(make_s3_builder(
            bkt.clone(),
            key.clone(),
            secret.clone(),
            token.clone(),
        )));
        config.register_build_project_database(Arc::new(make_s3_builder(bkt, key, secret, token)));

        let (http_client, _refetch_rx) = HTTPClient::new();
        let mut flow_like_state = FlowLikeState::new(config, http_client);
        flow_like_state.model_provider_config = state.provider.clone();
        flow_like_state.node_registry.write().await.node_registry = state.registry.clone();
        Ok(flow_like_state)
    }
}

fn make_s3_builder(
    bucket: String,
    access_key: String,
    secret_key: String,
    session_token: String,
) -> impl Fn(object_store::path::Path) -> ConnectBuilder {
    move |path| {
        let url = format!("s3://{}/{}", bucket, path);
        connect(&url)
            .storage_option("aws_access_key_id".to_string(), access_key.clone())
            .storage_option("aws_secret_access_key".to_string(), secret_key.clone())
            .storage_option("aws_session_token".to_string(), session_token.clone())
    }
}
