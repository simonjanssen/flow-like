use crate::{
    entity::bit, error::ApiError, middleware::jwt::AppUser,
    permission::global_permission::GlobalPermission, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like::bit::Bit;
use flow_like_storage::object_store::PutPayload;
use flow_like_types::{create_id, reqwest};
use futures_util::StreamExt;
use sea_orm::{ActiveModelTrait, ActiveValue::Set, EntityTrait};

#[tracing::instrument(name = "PUT /bit/{bit_id}", skip(state, user))]
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
            updated_bit.download_link = Set(bit.download_link.clone());
            updated_bit.hash = Set(bit.hash.clone());
        }
        updated_bit.authors = Set(bit.authors);
        updated_bit.updated_at = Set(chrono::Utc::now().naive_utc());
        updated_bit.dependencies = Set(bit.dependencies);
        updated_bit.dependency_tree_hash = Set(bit.dependency_tree_hash);
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
    let mut new_bit: bit::ActiveModel = bit.into();
    new_bit.id = Set(create_id());
    new_bit.created_at = Set(chrono::Utc::now().naive_utc());
    new_bit.updated_at = Set(chrono::Utc::now().naive_utc());
    let bit = new_bit.insert(&state.db).await?;

    Ok(Json(Bit::from(bit)))
}

#[tracing::instrument(name = "download_and_hash_bit", skip(bit, state))]
async fn download_and_hash(bit: &mut bit::Model, state: AppState) -> flow_like_types::Result<()> {
    let temporary_id = create_id();
    let path =
        flow_like_storage::object_store::path::Path::from("bits").child(temporary_id.clone());
    let store = state.cdn_bucket.clone();

    let old_location =
        flow_like_storage::object_store::path::Path::from("bits").child(bit.hash.clone());
    let _delete = store.as_generic().delete(&old_location).await;

    let url = match bit.download_link {
        Some(ref link) => link,
        None => return Ok(()),
    };

    let download_client = reqwest::get(url).await?;

    let mut download_stream = download_client.bytes_stream();
    let mut hasher = blake3::Hasher::new();

    let mut upload_request = store.as_generic().put_multipart(&path).await?;

    while let Some(chunk) = download_stream.next().await {
        if let Ok(chunk) = chunk {
            hasher.update(&chunk);
            let payload = PutPayload::from_bytes(chunk);
            upload_request.put_part(payload).await?;
        }
    }

    upload_request.complete().await?;
    let file_hash = hasher.finalize().to_hex().to_string().to_lowercase();
    bit.hash = file_hash.clone();

    store
        .as_generic()
        .copy(
            &path,
            &flow_like_storage::object_store::path::Path::from("bits").child(file_hash.clone()),
        )
        .await?;
    store.as_generic().delete(&path).await?;

    let url = state.platform_config.cdn.clone().unwrap_or("".to_string());
    let url = format!("{}/bits/{}", url, file_hash);
    bit.download_link = Some(url.to_string());

    Ok(())
}
