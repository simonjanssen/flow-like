use std::sync::Arc;

use crate::{
    entity::bit, error::ApiError, middleware::jwt::AppUser,
    permission::global_permission::GlobalPermission, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like::{bit::Bit, utils::http::HTTPClient};
use flow_like_storage::object_store::PutPayload;
use flow_like_types::{anyhow, create_id, reqwest};
use futures_util::StreamExt;
use hyper::header::{ACCEPT_RANGES, CONTENT_LENGTH, ETAG};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter, sqlx};

#[tracing::instrument(name = "PUT /admin/bit/{bit_id}", skip(state, user, bit))]
pub async fn upsert_bit(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(bit_id): Path<String>,
    Json(bit): Json<Bit>,
) -> Result<Json<Bit>, ApiError> {
    user.check_global_permission(&state, GlobalPermission::WriteBits)
        .await?;

    let mut bit: bit::Model = bit.into();
    let existing_bit = bit::Entity::find_by_id(&bit_id).one(&state.db).await?;

    if let Some(existing_bit) = existing_bit {
        let mut updated_bit: bit::ActiveModel = existing_bit.into();
        if updated_bit.download_link != Set(bit.download_link.clone()) {
            download_and_hash(&mut bit, state.clone()).await?;
            build_dependency_hash(&mut bit, state.clone()).await?;
            updated_bit.download_link = Set(bit.download_link.clone());
            updated_bit.hash = Set(bit.hash.clone());
            updated_bit.dependency_tree_hash = Set(bit.dependency_tree_hash.clone());
        }
        updated_bit.hub = Set(state.platform_config.domain.clone());
        updated_bit.authors = Set(bit.authors);
        updated_bit.updated_at = Set(chrono::Utc::now().naive_utc());
        updated_bit.dependencies = Set(bit.dependencies);
        updated_bit.file_name = Set(bit.file_name);
        updated_bit.hub = Set(bit.hub);
        updated_bit.license = Set(bit.license);
        updated_bit.parameters = Set(bit.parameters);
        updated_bit.repository = Set(bit.repository);
        updated_bit.size = Set(bit.size);
        updated_bit.r#type = Set(bit.r#type);
        updated_bit.version = Set(bit.version);
        let updated = updated_bit.update(&state.db).await?;

        return Ok(Json(Bit::from(updated)));
    }

    download_and_hash(&mut bit, state.clone()).await?;
    build_dependency_hash(&mut bit, state.clone()).await?;
    let dependency_tree_hash = bit.dependency_tree_hash.clone();
    let mut new_bit: bit::ActiveModel = bit.into();
    new_bit.id = Set(create_id());
    new_bit.hub = Set(state.platform_config.domain.clone());
    new_bit.created_at = Set(chrono::Utc::now().naive_utc());
    new_bit.updated_at = Set(chrono::Utc::now().naive_utc());
    match new_bit.insert(&state.db).await {
        Ok(bit) => Ok(Json(Bit::from(bit))),
        Err(e) => {
            let existing_bit = bit::Entity::find()
                .filter(bit::Column::DependencyTreeHash.eq(dependency_tree_hash))
                .one(&state.db)
                .await?
                .ok_or(anyhow!(
                    "Bit with the same dependency tree hash already exists"
                ))?;
            Ok(Json(Bit::from(existing_bit)))
        }
    }
}

#[tracing::instrument(name = "download_and_hash_bit", skip(bit, state))]
async fn download_and_hash(bit: &mut bit::Model, state: AppState) -> flow_like_types::Result<()> {
    // Get the E-Tag from the download link if available
    if bit.download_link.is_none() {
        tracing::warn!("No download link provided for bit {}", bit.id);
        return Ok(());
    }

    let store = state.cdn_bucket.clone();

    let old_location =
        flow_like_storage::object_store::path::Path::from("bits").child(bit.hash.clone());
    let _delete = store.as_generic().delete(&old_location).await;

    let url = match bit.download_link {
        Some(ref link) => link,
        None => return Ok(()),
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60 * 60 * 2))
        .connect_timeout(std::time::Duration::from_secs(30))
        .pool_idle_timeout(std::time::Duration::from_secs(90))
        .pool_max_idle_per_host(1)
        .http2_keep_alive_interval(Some(std::time::Duration::from_secs(30)))
        .http2_keep_alive_timeout(std::time::Duration::from_secs(60))
        .build()?;

    let response = client.head(url).send().await?;
    let content_length = response
        .headers()
        .get(CONTENT_LENGTH)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok());

    let supports_ranges = response
        .headers()
        .get(ACCEPT_RANGES)
        .map(|v| v.to_str().unwrap_or("").contains("bytes"))
        .unwrap_or(false);

    let e_tag = response
        .headers()
        .get(ETAG)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim().trim_matches('"').to_string())
        .unwrap_or_else(|| create_id());

    let path = flow_like_storage::object_store::path::Path::from("bits").child(e_tag.clone());

    const CHUNK_SIZE: usize = 50 * 1024 * 1024; // 20MB chunks

    let mut hasher = blake3::Hasher::new();
    let mut upload_request = store.as_generic().put_multipart(&path).await?;
    let mut total_downloaded = 0u64;

    if supports_ranges && content_length.is_some() {
        let file_size = content_length.unwrap();
        let mut start = 0u64;
        let mut pending_upload = None;

        while start < file_size {
            let end = std::cmp::min(start + CHUNK_SIZE as u64 - 1, file_size - 1);
            let range_header = format!("bytes={}-{}", start, end);

            let mut retry_count = 0;
            const MAX_RETRIES: u32 = 3;

            loop {
                match client.get(url).header("Range", &range_header).send().await {
                    Ok(chunk_response) => {
                        let chunk_bytes = chunk_response.bytes().await?;
                        hasher.update(&chunk_bytes);
                        let payload = PutPayload::from_bytes(chunk_bytes);

                        if let Some(handle) = pending_upload.take() {
                            handle.await??;
                        }

                        let upload_fut = upload_request.put_part(payload);
                        pending_upload =
                            Some(flow_like_types::tokio::spawn(
                                async move { upload_fut.await },
                            ));

                        total_downloaded += end - start + 1;
                        tracing::info!(
                            "Downloaded {}/{} bytes ({:.1}%)",
                            total_downloaded,
                            file_size,
                            (total_downloaded as f64 / file_size as f64) * 100.0
                        );
                        break;
                    }
                    Err(e) if retry_count < MAX_RETRIES => {
                        retry_count += 1;
                        tracing::warn!(
                            "Retry {}/{} for range {}-{}: {}",
                            retry_count,
                            MAX_RETRIES,
                            start,
                            end,
                            e
                        );
                        flow_like_types::tokio::time::sleep(std::time::Duration::from_secs(
                            2u64.pow(retry_count),
                        ))
                        .await;
                    }
                    Err(e) => return Err(e.into()),
                }
            }

            start = end + 1;
        }

        if let Some(upload_task) = pending_upload {
            upload_task.await??;
        }
    } else {
        let mut download_stream = client.get(url).send().await?.bytes_stream();

        while let Some(chunk_result) = download_stream.next().await {
            match chunk_result {
                Ok(chunk) => {
                    hasher.update(&chunk);
                    let len = chunk.len();
                    let payload = PutPayload::from_bytes(chunk);
                    upload_request.put_part(payload).await?;

                    total_downloaded += len as u64;
                    if total_downloaded % (100 * 1024 * 1024) == 0 {
                        // Log every 100MB
                        tracing::info!("Downloaded {} bytes", total_downloaded);
                    }
                }
                Err(e) => {
                    tracing::error!("Stream error: {}", e);
                    return Err(e.into());
                }
            }
        }
    }

    upload_request.complete().await?;
    let file_hash = hasher.finalize().to_hex().to_string().to_lowercase();
    bit.hash = file_hash.clone();
    if bit.dependency_tree_hash.is_empty() {
        bit.dependency_tree_hash = file_hash.clone();
    }

    bit.size = Some(total_downloaded as i64);

    let url = state.platform_config.cdn.clone().unwrap_or("".to_string());
    let url = format!("{}/bits/{}", url, e_tag);
    bit.download_link = Some(url.to_string());

    tracing::info!(
        "Successfully processed {} bytes with hash {}",
        total_downloaded,
        file_hash
    );
    Ok(())
}

#[tracing::instrument(name = "build_dependency_hash", skip(bit, state))]
async fn build_dependency_hash(
    bit: &mut bit::Model,
    state: AppState,
) -> flow_like_types::Result<()> {
    let mut dependencies = match &bit.dependencies {
        Some(deps) => deps.clone(),
        None => {
            tracing::warn!("No dependencies provided for bit {}", bit.id);
            bit.dependency_tree_hash = bit.hash.clone();
            return Ok(());
        }
    };

    if dependencies.is_empty() {
        bit.dependency_tree_hash = bit.hash.clone();
        return Ok(());
    }

    dependencies.sort();
    let mut hasher = blake3::Hasher::new();
    let (http_client, _rcv) = HTTPClient::new();
    let http_client = Arc::new(http_client);

    for dependency in dependencies {
        let (hub, id) = dependency.split_once(':').ok_or_else(|| {
            flow_like_types::Error::msg(format!("Invalid dependency format: {}", dependency))
        })?;

        if hub == state.platform_config.domain {
            let local_bit = bit::Entity::find_by_id(id)
                .one(&state.db)
                .await?
                .ok_or_else(|| {
                    flow_like_types::Error::msg(format!("Local bit not found: {}", id))
                })?;
            hasher.update(local_bit.dependency_tree_hash.as_bytes());
        } else {
            let hub = flow_like::hub::Hub::new(hub, http_client.clone()).await?;
            let remote_bit = hub.get_bit(id).await.map_err(|e| {
                flow_like_types::Error::msg(format!("Failed to fetch remote bit {}: {}", id, e))
            })?;
            hasher.update(remote_bit.dependency_tree_hash.as_bytes());
        }
    }

    let dependency_hash = hasher.finalize().to_hex().to_string().to_lowercase();
    bit.dependency_tree_hash = dependency_hash;
    tracing::info!(
        "Built dependency hash for bit {}: {}",
        bit.id,
        bit.dependency_tree_hash
    );

    Ok(())
}
