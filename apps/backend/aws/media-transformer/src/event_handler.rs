use std::{io::Cursor, sync::Arc};

use aws_lambda_events::event::s3::S3Event;
use flow_like_storage::{object_store::ObjectStore, Path};
use flow_like_types::imageproc::drawing::Canvas;
use image::ImageReader;
use lambda_runtime::{tracing, Error, LambdaEvent};

pub(crate) async fn function_handler(event: LambdaEvent<S3Event>) -> Result<(), Error> {
    // Extract some useful information from the request
    let payload = event.payload;
    let bucket_name = payload
        .records
        .first()
        .and_then(|record| record.s3.bucket.name.as_deref())
        .ok_or(Error::from("No bucket name found in the event"))?;

    let object_store = Arc::new(
        flow_like_storage::object_store::aws::AmazonS3Builder::new()
            .with_bucket_name(bucket_name)
            .build()
            .map_err(|e| Error::from(format!("Failed to create S3 object store: {}", e)))?,
    );

    for record in payload.records.iter() {
        let object = record.s3.object.clone();
        if let (Some(bucket), Some(key)) = (record.s3.bucket.name.as_ref(), object.key.as_ref()) {
            if bucket != bucket_name {
                tracing::warn!("Skipping object from different bucket: {}", bucket);
                continue;
            }

            // Replace current extension with .webp
            let to_key = key
                .split('.')
                .next()
                .map(|name| format!("{}.webp", name))
                .ok_or(Error::from("Failed to construct new key for the object"))?;

            let to_key = Path::from(to_key);
            let key_path = Path::from(key.clone());
            if key_path.extension() != Some("webp") {
                continue;
            }

            let reader = object_store
                .get(&key_path)
                .await
                .map_err(|e| Error::from(format!("Failed to get object {}: {}", key, e)))?;
            let read_stream = reader.bytes().await?;
            let cursor = Cursor::new(read_stream);

            let img = ImageReader::new(cursor).with_guessed_format()?;
            let mut new_img = img.decode()?;

            let is_quadratic = new_img.width() == new_img.height();
            if is_quadratic {
                new_img = new_img.resize(1024, 1024, image::imageops::FilterType::Lanczos3);
            } else {
                let (width, height) = new_img.dimensions();
                let new_width = if width > height {
                    1280
                } else {
                    (1280 * width / height) as u32
                };
                let new_height = if height > width {
                    1280
                } else {
                    (1280 * height / width) as u32
                };
                new_img =
                    new_img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3);
            }

            let mut buffer = Vec::new();
            let mut write_cursor = Cursor::new(&mut buffer);

            new_img
                .write_to(&mut write_cursor, image::ImageFormat::WebP)
                .map_err(|e| Error::from(format!("Failed to encode image to WebP: {}", e)))?;

            object_store
                .put(&to_key, buffer.into())
                .await
                .map_err(|e| Error::from(format!("Failed to put object {}: {}", to_key, e)))?;

            object_store.delete(&key_path).await.map_err(|e| {
                Error::from(format!("Failed to delete original object {}: {}", key, e))
            })?;
        }
    }

    Ok(())
}
