use std::{io::Cursor, sync::Arc};

use aws_lambda_events::{event::s3::S3Event, s3::S3EventRecord, sqs::{SqsBatchResponse, SqsEvent}};
use flow_like_storage::{object_store::{aws::AmazonS3, ObjectStore}, Path};
use flow_like_types::imageproc::drawing::Canvas;
use image::ImageReader;
use lambda_runtime::{tracing, Error, LambdaEvent};

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

async fn process_s3_events(records: &Vec<S3EventRecord>) -> Result<(), Error> {
    // Initialize object store and bucket name
    let bucket_name = records
        .first()
        .and_then(|r| r.s3.bucket.name.as_ref())
        .ok_or_else(|| Error::from("No bucket name found in S3 event records"))?
        .to_string();

    let object_store = Arc::new(
        flow_like_storage::object_store::aws::AmazonS3Builder::new()
            .with_bucket_name(&bucket_name)
            .build()
            .map_err(|e| Error::from(format!("Failed to create S3 object store: {}", e)))?,
    );

    for record in records {
        if let Err(err) = process_single_record(record, object_store.clone(), &bucket_name).await {
            tracing::error!("Failed to process record: {}", err);
            // Continue processing other records instead of failing the entire batch
            continue;
        }
    }

    Ok(())
}

async fn process_single_record(
    record: &S3EventRecord,
    object_store: Arc<AmazonS3>,
    bucket_name: &str,
) -> Result<(), Error> {
    let object = &record.s3.object;
    let bucket = record.s3.bucket.name.as_ref()
        .ok_or_else(|| Error::from("Missing bucket name in S3 event"))?;
    let key = object.key.as_ref()
        .ok_or_else(|| Error::from("Missing object key in S3 event"))?;

    // Skip objects from different buckets
    if bucket != bucket_name {
        tracing::warn!("Skipping object from different bucket: {}", bucket);
        return Ok(());
    }

    let key_path = Path::from(key.clone());

    // Skip already converted WebP files
    if key_path.extension() == Some("webp") {
        tracing::info!("Skipping already converted webp file: {}", key);
        return Ok(());
    }

    let extension = key_path.extension().unwrap_or("");

    // Handle unsupported file types
    if !is_supported_image_format(extension) {
        if is_video_format(extension) {
            tracing::info!("Skipping video file: {}", key);
            return Ok(());
        }

        tracing::info!("Deleting unsupported file type: {}", key);
        object_store.delete(&key_path).await
            .map_err(|e| Error::from(format!("Failed to delete unsupported file {}: {}", key, e)))?;
        return Ok(());
    }

    // Process the image
    let converted_key = generate_webp_key(&key_path)?;
    convert_and_store_image(object_store.clone(), &key_path, &converted_key).await?;

    // Delete original file after successful conversion
    object_store.delete(&key_path).await
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

fn generate_webp_key(key_path: &Path) -> Result<Path, Error> {
    let filename = key_path.filename()
        .ok_or_else(|| Error::from("Failed to extract filename from path"))?;

    let stem_without_ext = filename.split('.').next().unwrap_or(filename);
    let string_path = key_path.to_string();

    // Ensure the path starts with "media/"
    if !string_path.starts_with("media/") {
        return Err(Error::from(format!("Path must start with 'media/': {}", string_path)));
    }

    let mut result_path = Path::from("media");

    for part in string_path.split('/').skip(1) { // Skip the "media" prefix
        if part.is_empty() {
            continue;
        }

        if part == filename {
            // Replace the filename with the webp version
            result_path = result_path.child(format!("{}.webp", stem_without_ext));
        } else {
            result_path = result_path.child(part);
        }
    }

    Ok(result_path)
}

async fn convert_and_store_image(
    object_store: Arc<AmazonS3>,
    source_key: &Path,
    target_key: &Path,
) -> Result<(), Error> {
    // Download the image
    let reader = object_store.get(source_key).await
        .map_err(|e| Error::from(format!("Failed to download image {}: {}", source_key, e)))?;

    let image_data = reader.bytes().await
        .map_err(|e| Error::from(format!("Failed to read image data: {}", e)))?;

    // Decode and process the image
    let cursor = Cursor::new(image_data);
    let img = ImageReader::new(cursor)
        .with_guessed_format()
        .map_err(|e| Error::from(format!("Failed to guess image format: {}", e)))?;

    let mut decoded_img = img.decode()
        .map_err(|e| Error::from(format!("Failed to decode image: {}", e)))?;

    // Resize the image
    decoded_img = resize_image(decoded_img);

    // Convert to WebP
    let webp_data = encode_as_webp(decoded_img)?;

    // Upload the converted image
    object_store.put(target_key, webp_data.into()).await
        .map_err(|e| Error::from(format!("Failed to upload converted image {}: {}", target_key, e)))?;

    Ok(())
}

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

        img.resize(new_width, new_height, image::imageops::FilterType::CatmullRom)
    }
}

fn encode_as_webp(img: image::DynamicImage) -> Result<Vec<u8>, Error> {
    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);

    img.write_to(&mut cursor, image::ImageFormat::WebP)
        .map_err(|e| Error::from(format!("Failed to encode image as WebP: {}", e)))?;

    Ok(buffer)
}