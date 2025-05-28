use std::collections::HashMap;

use axum::{
    Router,
    routing::{get, post},
};
use chrono::NaiveDateTime;
use flow_like::bit::{Bit, BitTypes};

use crate::{
    entity::{bit, sea_orm_active_enums::BitType},
    state::AppState,
};

pub mod delete_bit;
pub mod get_bit;
pub mod search_bits;
pub mod upsert_bit;

impl From<BitType> for BitTypes {
    fn from(value: BitType) -> Self {
        match value {
            BitType::Llm => BitTypes::Llm,
            BitType::Vlm => BitTypes::Vlm,
            BitType::Embedding => BitTypes::Embedding,
            BitType::ImageEmbedding => BitTypes::ImageEmbedding,
            BitType::File => BitTypes::File,
            BitType::Media => BitTypes::Media,
            BitType::Template => BitTypes::Template,
            BitType::Tokenizer => BitTypes::Tokenizer,
            BitType::TokenizerConfig => BitTypes::TokenizerConfig,
            BitType::SpecialTokensMap => BitTypes::SpecialTokensMap,
            BitType::Config => BitTypes::Config,
            BitType::Course => BitTypes::Course,
            BitType::PreprocessorConfig => BitTypes::PreprocessorConfig,
            BitType::Projection => BitTypes::Projection,
            BitType::Project => BitTypes::Project,
            BitType::Board => BitTypes::Board,
            BitType::Other => BitTypes::Other,
            BitType::ObjectDetection => BitTypes::ObjectDetection,
        }
    }
}

impl From<BitTypes> for BitType {
    fn from(value: BitTypes) -> Self {
        match value {
            BitTypes::Llm => BitType::Llm,
            BitTypes::Vlm => BitType::Vlm,
            BitTypes::Embedding => BitType::Embedding,
            BitTypes::ImageEmbedding => BitType::ImageEmbedding,
            BitTypes::File => BitType::File,
            BitTypes::Media => BitType::Media,
            BitTypes::Template => BitType::Template,
            BitTypes::Tokenizer => BitType::Tokenizer,
            BitTypes::TokenizerConfig => BitType::TokenizerConfig,
            BitTypes::SpecialTokensMap => BitType::SpecialTokensMap,
            BitTypes::Config => BitType::Config,
            BitTypes::Course => BitType::Course,
            BitTypes::PreprocessorConfig => BitType::PreprocessorConfig,
            BitTypes::Projection => BitType::Projection,
            BitTypes::Project => BitType::Project,
            BitTypes::Board => BitType::Board,
            BitTypes::Other => BitType::Other,
            BitTypes::ObjectDetection => BitType::ObjectDetection,
        }
    }
}

impl From<bit::Model> for Bit {
    fn from(value: bit::Model) -> Self {
        let created_string = value.created_at.and_utc().to_rfc3339();
        let updated_string = value.updated_at.and_utc().to_rfc3339();
        Bit {
            id: value.id,
            authors: value.authors.unwrap_or_default(),
            bit_type: value.r#type.into(),
            updated: updated_string,
            created: created_string,
            dependencies: value.dependencies.unwrap_or_default(),
            dependency_tree_hash: value.dependency_tree_hash,
            download_link: value.download_link,
            license: value.license,
            file_name: value.file_name,
            hash: value.hash,
            hub: value.hub,
            meta: HashMap::new(),
            parameters: value.parameters.unwrap_or_default(),
            repository: value.repository,
            size: value.size.map(|s| s as u64),
            version: value.version,
        }
    }
}

impl From<Bit> for bit::Model {
    fn from(value: Bit) -> Self {
        let now_time = chrono::Utc::now().naive_utc();

        let created_string = NaiveDateTime::parse_from_str(&value.created, "%Y-%m-%dT%H:%M:%S%.fZ")
            .unwrap_or(now_time);
        let updated_string = NaiveDateTime::parse_from_str(&value.updated, "%Y-%m-%dT%H:%M:%S%.fZ")
            .unwrap_or(now_time);

        bit::Model {
            id: value.id,
            authors: Some(value.authors),
            r#type: value.bit_type.into(),
            updated_at: updated_string,
            created_at: created_string,
            dependencies: Some(value.dependencies),
            dependency_tree_hash: value.dependency_tree_hash,
            download_link: value.download_link,
            license: value.license,
            file_name: value.file_name,
            hash: value.hash,
            hub: value.hub,
            parameters: Some(value.parameters),
            repository: value.repository,
            size: value.size.map(|s| s as i64),
            version: value.version,
        }
    }
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", post(search_bits::search_bits))
        .route(
            "/{bit_id}",
            get(get_bit::get_bit)
                .put(upsert_bit::upsert_bit)
                .delete(delete_bit::delete_bit),
        )
}
