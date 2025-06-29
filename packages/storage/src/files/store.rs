use flow_like_types::{
    Cacheable, JsonSchema, Result, anyhow, bail,
    reqwest::{self, Url},
    utils::data_url::pathbuf_to_data_url,
};
use futures::StreamExt;
use local_store::LocalObjectStore;
use object_store::{ObjectMeta, ObjectStore, PutPayload, path::Path, signer::Signer};
use serde::{Deserialize, Serialize};
use std::{sync::Arc, time::Duration};
use urlencoding::encode;
pub mod local_store;

#[derive(Clone, Serialize, Deserialize, JsonSchema)]
pub struct StorageItem {
    pub location: String,
    pub last_modified: String,
    pub size: usize,
    pub e_tag: Option<String>,
    pub version: Option<String>,
}

impl From<ObjectMeta> for StorageItem {
    fn from(meta: ObjectMeta) -> Self {
        Self {
            location: meta.location.to_string(),
            last_modified: meta.last_modified.to_string(),
            size: meta.size,
            e_tag: meta.e_tag,
            version: meta.version,
        }
    }
}

#[derive(Clone, Debug)]
pub enum FlowLikeStore {
    Local(Arc<LocalObjectStore>),
    AWS(Arc<object_store::aws::AmazonS3>),
    Azure(Arc<object_store::azure::MicrosoftAzure>),
    Google(Arc<object_store::gcp::GoogleCloudStorage>),
    Other(Arc<dyn ObjectStore>),
}

impl Cacheable for FlowLikeStore {
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

impl FlowLikeStore {
    pub fn as_generic(&self) -> Arc<dyn ObjectStore> {
        match self {
            FlowLikeStore::Local(store) => store.clone() as Arc<dyn ObjectStore>,
            FlowLikeStore::AWS(store) => store.clone() as Arc<dyn ObjectStore>,
            FlowLikeStore::Azure(store) => store.clone() as Arc<dyn ObjectStore>,
            FlowLikeStore::Google(store) => store.clone() as Arc<dyn ObjectStore>,
            FlowLikeStore::Other(store) => store.clone() as Arc<dyn ObjectStore>,
        }
    }

    pub async fn create_folder(&self, path: &Path, folder_name: &str) -> Result<()> {
        let content = b"0";
        let dir_path = path.child(format!("_{}_._path", folder_name));
        self.as_generic()
            .put(&dir_path, PutPayload::from_static(content))
            .await
            .map_err(|e| anyhow!("Failed to create directory: {}", e))?;
        Ok(())
    }

    pub async fn construct_upload(
        &self,
        app_id: &str,
        prefix: &str,
        construct_dirs: bool,
    ) -> Result<Path> {
        let mut base_path = Path::from("apps").child(app_id).child("upload");

        let prefix_parts: Vec<&str> = prefix.split('/').filter(|s| !s.is_empty()).collect();

        for (index, prefix) in prefix_parts.iter().enumerate() {
            if construct_dirs && (prefix_parts.len() > 0) && (index < prefix_parts.len() - 1) {
                let dir_marker = base_path.child(format!("_{}_._path", prefix));
                let exists = self.as_generic().head(&dir_marker).await;
                if exists.is_err() {
                    self.create_folder(&base_path, prefix).await?;
                }
            }

            base_path = base_path.child(*prefix);
        }

        Ok(base_path)
    }

    pub async fn sign(&self, method: &str, path: &Path, expires_after: Duration) -> Result<Url> {
        let method = match method.to_uppercase().as_str() {
            "GET" => reqwest::Method::GET,
            "PUT" => reqwest::Method::PUT,
            "POST" => reqwest::Method::POST,
            "DELETE" => reqwest::Method::DELETE,
            _ => bail!("Invalid HTTP Method"),
        };

        let url: Url = match self {
            FlowLikeStore::AWS(store) => store.signed_url(method, path, expires_after).await?,
            FlowLikeStore::Google(store) => store.signed_url(method, path, expires_after).await?,
            FlowLikeStore::Azure(store) => store.signed_url(method, path, expires_after).await?,
            FlowLikeStore::Local(store) => {
                let local_path = store.path_to_filesystem(path)?;

                // Auto-detect Tauri environment
                let is_tauri = cfg!(feature = "tauri") || std::env::var("TAURI_ENV").is_ok();

                if is_tauri {
                    let urlencoded_path = encode(local_path.to_str().unwrap_or(""));
                    let url = if cfg!(windows) {
                        format!("http://{}.localhost/{}", "asset", urlencoded_path)
                    } else {
                        format!("{}://{}", "asset", urlencoded_path)
                    };
                    let url = Url::parse(&url)?;
                    return Ok(url);
                }

                let data_url = pathbuf_to_data_url(&local_path).await?;
                return Ok(Url::parse(&data_url)?);
            }
            FlowLikeStore::Other(_) => bail!("Sign not implemented for this store"),
        };

        Ok(url)
    }

    pub async fn hash(&self, path: &Path) -> Result<String> {
        let store = self.as_generic();
        let meta = store.head(path).await?;

        if let Some(hash) = meta.e_tag {
            return Ok(hash);
        }

        let mut hash = blake3::Hasher::new();
        let mut reader = store.get(path).await?.into_stream();

        while let Some(data) = reader.next().await {
            let data = data?;
            hash.update(&data);
        }

        let finalized = hash.finalize();
        let finalized = finalized.to_hex().to_lowercase().to_string();
        Ok(finalized)
    }
}
