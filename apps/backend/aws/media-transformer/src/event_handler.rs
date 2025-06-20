use aws_config::BehaviorVersion;
use aws_lambda_events::{
    event::s3::S3Event,
    s3::S3EventRecord,
    sqs::{SqsBatchResponse, SqsEvent},
};
use aws_sdk_s3::{primitives::ByteStream, Client as S3Client};
use image::ImageReader;
use imageproc::drawing::Canvas;
use lambda_runtime::{tracing, Error, LambdaEvent};
use std::io::Cursor;

#[tracing::instrument(name = "SQS Function Handler", skip(event))]
pub(crate) async fn function_handler(
    event: LambdaEvent<SqsEvent>,
) -> Result<SqsBatchResponse, Error> {
    let mut batch_item_failures = Vec::new();

    for record in event.payload.records.iter() {
        let body = &record.body;
        let s3_event = body
            .as_ref()
            .ok_or_else(|| Error::from("Record body is missing"))?;

        let s3_event: S3Event = serde_json::from_str(s3_event)
            .map_err(|e| Error::from(format!("Failed to parse SQS message: {}", e)))?;

        if let Err(err) = process_s3_events(&s3_event.records).await {
            tracing::error!("Error processing S3 event: {}", err);
            let message_id = record.message_id.clone().unwrap_or_default();
            tracing::error!("Failed to process S3 event for message ID: {}", &message_id);
            batch_item_failures.push(aws_lambda_events::sqs::BatchItemFailure {
                item_identifier: message_id,
            });
        }
    }

    Ok(SqsBatchResponse {
        batch_item_failures,
    })
}

#[tracing::instrument(name = "Process S3 Events", skip(records))]
async fn process_s3_events(records: &Vec<S3EventRecord>) -> Result<(), Error> {
    let bucket_name = std::env::var("BUCKET_NAME").map_err(|e| {
        Error::from(format!(
            "Failed to get BUCKET_NAME environment variable: {}",
            e
        ))
    })?;

    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let s3_client = S3Client::new(&config);

    for record in records {
        if let Err(err) = process_single_record(record, &s3_client, &bucket_name).await {
            tracing::error!("Failed to process record: {}", err);
            // Continue processing other records instead of failing the entire batch
            continue;
        }
    }

    Ok(())
}

#[tracing::instrument(name = "Process Single Event", skip(record, s3_client, bucket_name))]
async fn process_single_record(
    record: &S3EventRecord,
    s3_client: &S3Client,
    bucket_name: &str,
) -> Result<(), Error> {
    let object = &record.s3.object;
    let bucket = record
        .s3
        .bucket
        .name
        .as_ref()
        .ok_or_else(|| Error::from("Missing bucket name in S3 event"))?;
    let key = object
        .key
        .as_ref()
        .ok_or_else(|| Error::from("Missing object key in S3 event"))?;

    if bucket != bucket_name {
        tracing::warn!("Skipping object from different bucket: {}", bucket);
        return Ok(());
    }

    if key.ends_with(".webp") {
        tracing::info!("Skipping already converted webp file: {}", key);
        return Ok(());
    }

    let extension = key.split('.').last().unwrap_or("");

    // Handle unsupported file types
    if !is_supported_image_format(extension) {
        if is_video_format(extension) {
            tracing::info!("Skipping video file: {}", key);
            return Ok(());
        }

        tracing::info!("Deleting unsupported file type: {}", key);
        s3_client
            .delete_object()
            .bucket(bucket_name)
            .key(key)
            .send()
            .await
            .map_err(|e| {
                Error::from(format!("Failed to delete unsupported file {}: {}", key, e))
            })?;
        return Ok(());
    }

    // Process the image
    let converted_key = generate_webp_key(key)?;
    convert_and_store_image(s3_client, bucket_name, key, &converted_key).await?;

    // Delete original file after successful conversion
    s3_client
        .delete_object()
        .bucket(bucket_name)
        .key(key)
        .send()
        .await
        .map_err(|e| Error::from(format!("Failed to delete original file {}: {}", key, e)))?;

    tracing::info!("Successfully converted {} to {}", key, converted_key);
    Ok(())
}

fn is_supported_image_format(extension: &str) -> bool {
    matches!(
        extension.to_lowercase().as_str(),
        "jpg" | "jpeg" | "png" | "gif" | "bmp" | "tiff" | "avif" | "heic"
    )
}

fn is_video_format(extension: &str) -> bool {
    matches!(
        extension.to_lowercase().as_str(),
        "mp4" | "mov" | "avi" | "mkv" | "flv" | "wmv"
    )
}

fn generate_webp_key(key: &str) -> Result<String, Error> {
    // Ensure the path starts with "media/"
    if !key.starts_with("media/") {
        return Err(Error::from(format!(
            "Path must start with 'media/': {}",
            key
        )));
    }

    // Find the last dot to replace the extension
    if let Some(last_dot) = key.rfind('.') {
        Ok(format!("{}.webp", &key[..last_dot]))
    } else {
        // No extension found, just append .webp
        Ok(format!("{}.webp", key))
    }
}

#[tracing::instrument(name = "Convert and Store Image", skip(s3_client, bucket_name))]
async fn convert_and_store_image(
    s3_client: &S3Client,
    bucket_name: &str,
    source_key: &str,
    target_key: &str,
) -> Result<(), Error> {
    // Check if target already exists to avoid unnecessary work
    match s3_client
        .head_object()
        .bucket(bucket_name)
        .key(target_key)
        .send()
        .await
    {
        Ok(_) => {
            tracing::info!(
                "Target WebP already exists, skipping conversion: {}",
                target_key
            );
            return Ok(());
        }
        Err(_) => {
            // Target doesn't exist, proceed with conversion
        }
    }

    let response = s3_client
        .get_object()
        .bucket(bucket_name)
        .key(source_key)
        .send()
        .await
        .map_err(|e| Error::from(format!("Failed to download image {}: {}", source_key, e)))?;

    let image_data = response
        .body
        .collect()
        .await
        .map_err(|e| Error::from(format!("Failed to read image data: {}", e)))?
        .into_bytes();

    let cursor = Cursor::new(image_data);
    let img = ImageReader::new(cursor)
        .with_guessed_format()
        .map_err(|e| {
            Error::from(format!(
                "Image format detection failed for {}: {}",
                source_key, e
            ))
        })?;

    let mut decoded_img = img
        .decode()
        .map_err(|e| Error::from(format!("Image decoding failed for {}: {}", source_key, e)))?;

    decoded_img = resize_image(decoded_img);

    let webp_data = encode_as_webp(decoded_img)?;

    s3_client
        .put_object()
        .bucket(bucket_name)
        .key(target_key)
        .body(ByteStream::from(webp_data))
        .content_type("image/webp")
        .send()
        .await
        .map_err(|e| {
            Error::from(format!(
                "Failed to upload converted image {}: {}",
                target_key, e
            ))
        })?;

    Ok(())
}

#[tracing::instrument(name = "Resize Image", skip(img))]
fn resize_image(img: image::DynamicImage) -> image::DynamicImage {
    let (width, height) = img.dimensions();

    if width == height {
        // Square image - resize to 1024x1024
        img.resize(1024, 1024, image::imageops::FilterType::CatmullRom)
    } else {
        // Non-square image - maintain aspect ratio with max dimension of 1280
        let (new_width, new_height) = if width > height {
            (1280, (1280 * height / width) as u32)
        } else {
            ((1280 * width / height) as u32, 1280)
        };

        img.resize(
            new_width,
            new_height,
            image::imageops::FilterType::CatmullRom,
        )
    }
}

#[tracing::instrument(name = "Encode Image as WebP", skip(img))]
fn encode_as_webp(img: image::DynamicImage) -> Result<Vec<u8>, Error> {
    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);

    img.write_to(&mut cursor, image::ImageFormat::WebP)
        .map_err(|e| Error::from(format!("Failed to encode image as WebP: {}", e)))?;

    Ok(buffer)
}
