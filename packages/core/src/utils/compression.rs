use flow_like_storage::Path;
use flow_like_storage::object_store::{ObjectStore, PutPayload};
use flow_like_types::Message;
use lz4_flex::{compress_prepend_size, decompress_size_prepended};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use tracing::instrument;
use std::sync::Arc;

///Write a Serde Serializable Struct to compressed file using bitcode + lz4
pub async fn compress_to_file<T>(
    store: Arc<dyn ObjectStore>,
    file_path: Path,
    input: &T,
) -> flow_like_types::Result<()>
where
    T: Message,
{
    let mut data = Vec::new();
    input.encode(&mut data)?;
    let compressed = compress_prepend_size(&data);
    let _result = store.put(&file_path, PutPayload::from(compressed)).await?;
    Ok(())
}

pub async fn compress_to_file_json<T>(
    store: Arc<dyn ObjectStore>,
    file_path: Path,
    input: &T,
) -> flow_like_types::Result<()>
where
    T: Serialize + Deserialize<'static>,
{
    let data = flow_like_types::json::to_vec(input)?;
    let compressed = compress_prepend_size(&data);
    let _result = store.put(&file_path, PutPayload::from(compressed)).await?;
    Ok(())
}

/// Read from a compressed file and deserialize it into a Serde Deserializable Struct
#[instrument(skip(store))]
pub async fn from_compressed<T>(
    store: Arc<dyn ObjectStore>,
    file_path: Path,
) -> flow_like_types::Result<T>
where
    T: Message + Default,
{
    let span = tracing::info_span!("from_compressed", file_path = %file_path);
    let _enter = span.enter();

    let read_span = tracing::info_span!("read_file");
    let _read_enter = read_span.enter();
    let reader = store.get(&file_path).await?;
    drop(_read_enter);
    let bytes_span = tracing::info_span!("read_bytes");
    let _bytes_enter = bytes_span.enter();
    let bytes = reader.bytes().await?;
    drop(_bytes_enter);

    let decompress_span = tracing::info_span!("decompress");
    let _decompress_enter = decompress_span.enter();
    let data = decompress_size_prepended(&bytes)?;
    drop(_decompress_enter);

    let decode_span = tracing::info_span!("decode_message");
    let _decode_enter = decode_span.enter();
    let message = T::decode(&data[..])?;
    drop(_decode_enter);

    Ok(message)
}

pub async fn from_compressed_json<T>(
    store: Arc<dyn ObjectStore>,
    file_path: Path,
) -> flow_like_types::Result<T>
where
    T: Serialize + DeserializeOwned,
{
    let reader = store.get(&file_path).await?;
    let bytes = reader.bytes().await?;
    let data = decompress_size_prepended(&bytes)?;

    let data: T = flow_like_types::json::from_slice(&data)?;
    Ok(data)
}
