use std::time::Duration;

use anyhow::anyhow;
use flow_like::{
    flow_like_storage::{
        Path,
        files::store::{FlowLikeStore, StorageItem},
        object_store::{MultipartUpload, ObjectMeta, PutPayload},
    },
    utils::storage::construct_storage,
};
use flow_like_types::{
    Bytes, Value, create_id, json,
    tokio::io::{AsyncReadExt, BufReader},
};
use futures::{StreamExt, TryStreamExt};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, ipc::Channel};
use tauri_plugin_dialog::DialogExt;

use crate::{functions::TauriFunctionError, state::TauriFlowLikeState};

async fn copy_large_file(
    store: &FlowLikeStore,
    from_path: &std::path::Path,
    to_path: &Path,
) -> Result<(), TauriFunctionError> {
    let mut reader = BufReader::new(
        flow_like_types::tokio::fs::File::open(from_path)
            .await
            .map_err(|e| anyhow!("Failed to open file: {}", e))?,
    );
    let mut upload_stream = store
        .as_generic()
        .put_multipart(to_path)
        .await
        .map_err(|e| anyhow!("Failed to create multipart upload: {}", e))?;

    let mut buffer = vec![0; 8 * 1024 * 1024];
    loop {
        let bytes_read = reader
            .read(&mut buffer)
            .await
            .map_err(|e| anyhow!("Failed to read file: {}", e))?;
        if bytes_read == 0 {
            break;
        }

        let chunk = Bytes::copy_from_slice(&buffer[..bytes_read]);

        upload_stream
            .put_part(PutPayload::from_bytes(chunk))
            .await
            .map_err(|e| anyhow!("Failed to upload file part: {}", e))?;
    }

    upload_stream
        .complete()
        .await
        .map_err(|e| anyhow!("Failed to complete upload: {}", e))?;
    Ok(())
}

async fn copy_directory_recursively(
    store: &FlowLikeStore,
    src_path: &std::path::Path,
    dest_path: &Path,
) -> Result<(), TauriFunctionError> {
    let dir_entries = flow_like_types::tokio::fs::read_dir(src_path)
        .await
        .map_err(|e| anyhow!("Failed to read directory: {}", e))?;

    let mut entries = Vec::new();
    let mut dir_handle = dir_entries;

    while let Some(entry) = dir_handle
        .next_entry()
        .await
        .map_err(|e| anyhow!("Failed to read directory entry: {}", e))?
    {
        entries.push(entry);
    }

    for entry in entries {
        let entry_path = entry.path();
        let file_name = entry_path
            .file_name()
            .ok_or(anyhow!("Invalid file name"))?
            .to_string_lossy();
        let target_path = dest_path.child(file_name.as_ref());

        let metadata = entry
            .metadata()
            .await
            .map_err(|e| anyhow!("Failed to read metadata: {}", e))?;

        if metadata.is_dir() {
            store.create_folder(dest_path, &file_name).await?;
            Box::pin(copy_directory_recursively(store, &entry_path, &target_path)).await?;
        } else if metadata.is_file() {
            match copy_large_file(store, &entry_path, &target_path).await {
                Ok(_) => {}
                Err(e) => {
                    println!("Error copying file {}: {:?}", file_name, e);
                    continue;
                }
            }
        }
    }

    Ok(())
}

#[tauri::command(async)]
pub async fn storage_add(
    app_handle: AppHandle,
    app_id: String,
    prefix: String,
) -> Result<String, TauriFunctionError> {
    let state = TauriFlowLikeState::construct(&app_handle).await?;
    let (store, path) = construct_storage(&state, &app_id, &prefix, true).await?;

    let upload_url = store
        .sign("PUT", &path, Duration::from_secs(60 * 60 * 24))
        .await
        .map_err(|e| anyhow!("Failed to sign URL: {}", e))?;

    Ok(upload_url.to_string())
}

#[tauri::command(async)]
pub async fn storage_remove(
    app_handle: AppHandle,
    app_id: String,
    prefixes: Vec<String>,
) -> Result<(), TauriFunctionError> {
    let state = TauriFlowLikeState::construct(&app_handle).await?;
    for prefix in prefixes.iter() {
        let (store, path) = construct_storage(&state, &app_id, &prefix, false).await?;
        let generic = store.as_generic();
        let locations = generic.list(Some(&path)).map_ok(|m| m.location).boxed();
        generic
            .delete_stream(locations)
            .try_collect::<Vec<Path>>()
            .await
            .map_err(|e| anyhow!("Failed to delete stream: {}", e))?;
        generic
            .delete(&path)
            .await
            .map_err(|e| anyhow!("Failed to delete path: {}", e))?;
    }
    Ok(())
}

#[tauri::command(async)]
pub async fn storage_rename(
    app_handle: AppHandle,
    app_id: String,
    prefix: String,
) -> Result<(), TauriFunctionError> {
    let state = TauriFlowLikeState::construct(&app_handle).await?;
    let (store, path) = construct_storage(&state, &app_id, &prefix, true).await?;

    Ok(())
}

#[tauri::command(async)]
pub async fn storage_list(
    app_handle: AppHandle,
    app_id: String,
    prefix: String,
) -> Result<Vec<StorageItem>, TauriFunctionError> {
    let state = TauriFlowLikeState::construct(&app_handle).await?;
    let (store, path) = construct_storage(&state, &app_id, &prefix, false).await?;
    println!("Listing items in storage at path: {}, {:?}", path, store);
    let items = store
        .as_generic()
        .list_with_delimiter(Some(&path))
        .await
        .map_err(|e| anyhow!("Failed to list items: {}", e))?;
    let items: Vec<StorageItem> = items.objects.into_iter().map(StorageItem::from).collect();
    println!("Listed {} items", items.len());
    Ok(items)
}

#[tauri::command(async)]
pub async fn storage_get(
    app_handle: AppHandle,
    app_id: String,
    prefixes: Vec<String>,
) -> Result<Vec<Value>, TauriFunctionError> {
    let state = TauriFlowLikeState::construct(&app_handle).await?;
    let mut urls = Vec::with_capacity(prefixes.len());

    for prefix in prefixes.iter() {
        let (store, path) = construct_storage(&state, &app_id, &prefix, false).await?;
        let signed_url = match store
            .sign("GET", &path, Duration::from_secs(60 * 60 * 24))
            .await
        {
            Ok(url) => url,
            Err(e) => {
                let id = create_id();
                tracing::error!(
                    "[{}] Failed to sign URL for prefix '{}': {:?} [for project {}]",
                    id,
                    prefix,
                    e,
                    app_id
                );
                urls.push(json::json!({
                    "prefix": prefix,
                    "error": format!("Failed to create signed URL, reference ID: {}", id),
                }));
                continue;
            }
        };

        urls.push(json::json!({
            "prefix": prefix,
            "url": signed_url.to_string(),
        }));
    }
    return Ok(urls);
}

#[tauri::command(async)]
pub async fn storage_to_fullpath(
    app_handle: AppHandle,
    app_id: String,
    prefix: String,
) -> Result<String, TauriFunctionError> {
    let state = TauriFlowLikeState::construct(&app_handle).await?;
    let (store, path) = construct_storage(&state, &app_id, &prefix, true).await?;
    let url = match store {
        FlowLikeStore::Local(store) => {
            let local_path = store
                .path_to_filesystem(&path)
                .map_err(|e| anyhow!("Failed to get local path: {}", e))?;
            let local_path = local_path.to_string_lossy();
            Ok(local_path.to_string())
        }
        _ => Err(anyhow!("Not a local store")),
    }?;
    Ok(url)
}
