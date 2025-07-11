use crate::state::FlowLikeState;
use crate::utils::compression::{compress_to_file_json, from_compressed_json};
use crate::utils::download::download_bit;
use flow_like_model_provider::provider::{
    EmbeddingModelProvider, ImageEmbeddingModelProvider, ModelProvider,
};
use flow_like_storage::Path;
use flow_like_storage::files::store::local_store::LocalObjectStore;
use flow_like_types::Value;
use flow_like_types::intercom::InterComCallback;
use flow_like_types::sync::Mutex;

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::SystemTime;

#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct Metadata {
    pub name: String,
    pub description: String,
    pub long_description: Option<String>,
    pub release_notes: Option<String>,
    pub tags: Vec<String>,
    pub use_case: Option<String>,
    pub icon: Option<String>,
    pub thumbnail: Option<String>,
    pub preview_media: Vec<String>,
    pub age_rating: Option<i32>,
    pub website: Option<String>,
    pub support_url: Option<String>,
    pub docs_url: Option<String>,
    pub organization_specific_values: Option<Vec<u8>>,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug, PartialEq)]
pub enum BitTypes {
    Llm,
    Vlm,
    Embedding,
    ImageEmbedding,
    File,
    Media,
    Template,
    Tokenizer,
    TokenizerConfig,
    SpecialTokensMap,
    Config,
    Course,
    PreprocessorConfig,
    Projection,
    Project,
    Board,
    Other,
    ObjectDetection,
}
#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug, Default)]
pub struct BitModelPreference {
    pub multimodal: Option<bool>,
    pub cost_weight: Option<f32>,
    pub speed_weight: Option<f32>,
    pub reasoning_weight: Option<f32>,
    pub creativity_weight: Option<f32>,
    pub factuality_weight: Option<f32>,
    pub function_calling_weight: Option<f32>,
    pub safety_weight: Option<f32>,
    pub openness_weight: Option<f32>,
    pub multilinguality_weight: Option<f32>,
    pub coding_weight: Option<f32>,
    pub model_hint: Option<String>,
}

fn enforce_bound(weight: &mut Option<f32>) {
    if let Some(w) = weight {
        *w = w.clamp(0.0, 1.0);
    }
}

impl BitModelPreference {
    fn normalize_weight(weight: &mut Option<f32>) {
        if let Some(w) = weight {
            if *w <= 0.0 {
                *weight = None;
            } else if *w > 1.0 {
                *weight = Some(1.0);
            }
        }
    }

    pub fn enforce_bounds(&mut self) {
        enforce_bound(&mut self.cost_weight);
        enforce_bound(&mut self.speed_weight);
        enforce_bound(&mut self.reasoning_weight);
        enforce_bound(&mut self.creativity_weight);
        enforce_bound(&mut self.factuality_weight);
        enforce_bound(&mut self.function_calling_weight);
        enforce_bound(&mut self.safety_weight);
        enforce_bound(&mut self.openness_weight);
        enforce_bound(&mut self.multilinguality_weight);
        enforce_bound(&mut self.coding_weight);
    }

    pub fn parse(&self) -> Self {
        let mut cloned = self.clone();
        cloned.inner_parse();
        cloned
    }

    fn inner_parse(&mut self) {
        Self::normalize_weight(&mut self.cost_weight);
        Self::normalize_weight(&mut self.speed_weight);
        Self::normalize_weight(&mut self.reasoning_weight);
        Self::normalize_weight(&mut self.creativity_weight);
        Self::normalize_weight(&mut self.factuality_weight);
        Self::normalize_weight(&mut self.function_calling_weight);
        Self::normalize_weight(&mut self.safety_weight);
        Self::normalize_weight(&mut self.openness_weight);
        Self::normalize_weight(&mut self.multilinguality_weight);
        Self::normalize_weight(&mut self.coding_weight);

        if let Some(model_hint) = &self.model_hint {
            if model_hint.is_empty() {
                self.model_hint = None;
            }
        }
    }
}

#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct BitModelClassification {
    cost: f32,
    speed: f32,
    reasoning: f32,
    creativity: f32,
    factuality: f32,
    function_calling: f32,
    safety: f32,
    openness: f32,
    multilinguality: f32,
    coding: f32,
}

impl BitModelClassification {
    fn name_similarity(&self, hint: &str, bit: &Bit) -> flow_like_types::Result<f32> {
        let mut similarity: f32 = 0.0;

        if bit.meta.is_empty() {
            return Err(flow_like_types::anyhow!("No meta data found"));
        }

        for meta in bit.meta.values() {
            let local_similarity = strsim::jaro_winkler(&meta.name, hint) as f32;
            if local_similarity > similarity {
                similarity = local_similarity;
            }
        }

        let provider = bit.try_to_provider();
        if provider.is_none() {
            return Ok(similarity);
        }

        let provider = provider.unwrap();
        if let Some(model_id) = provider.model_id {
            let local_similarity = strsim::jaro_winkler(&model_id, hint) as f32;
            if local_similarity > similarity {
                similarity = local_similarity;
            }
        }

        Ok(similarity)
    }

    /// Calculates the score of the model in a range from 0 to 1 based on the provided preference
    pub fn score(&self, preference: &BitModelPreference, bit: &Bit) -> f32 {
        let mut total_score = 0.0;
        let name_similarity_weight = 0.2;

        if let Some(multimodal) = preference.multimodal {
            if multimodal && !bit.is_multimodal() {
                return 0.0;
            }
        }

        // Map weights to model fields dynamically
        let field_weight_pairs = vec![
            (preference.cost_weight, self.cost),
            (preference.speed_weight, self.speed),
            (preference.reasoning_weight, self.reasoning),
            (preference.creativity_weight, self.creativity),
            (preference.factuality_weight, self.factuality),
            (preference.function_calling_weight, self.function_calling),
            (preference.safety_weight, self.safety),
            (preference.openness_weight, self.openness),
            (preference.multilinguality_weight, self.multilinguality),
            (preference.coding_weight, self.coding),
        ];

        // Calculate the weighted sum
        let mut total_weight: f32 = field_weight_pairs.iter().filter_map(|(w, _)| *w).sum();
        if total_weight == 0.0 {
            return 0.0; // Avoid division by zero
        }

        if let Some(hint) = &preference.model_hint {
            if let Ok(name_similarity) = self.name_similarity(hint, bit) {
                if name_similarity > 0.8 {
                    total_score += name_similarity_weight * name_similarity;
                    total_weight += name_similarity_weight;
                }
            }
        }

        for (weight, value) in field_weight_pairs {
            if let Some(w) = weight {
                total_score += w * value;
            }
        }

        total_score / total_weight
    }
}
#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct Bit {
    pub id: String,
    #[serde(rename = "type")]
    pub bit_type: BitTypes,
    pub meta: std::collections::HashMap<String, Metadata>,
    pub authors: Vec<String>,
    pub repository: Option<String>,
    pub download_link: Option<String>,
    pub file_name: Option<String>,
    pub hash: String,
    pub size: Option<u64>,
    pub hub: String,
    pub parameters: Value,
    pub version: Option<String>,
    pub license: Option<String>,
    pub dependencies: Vec<String>,
    pub dependency_tree_hash: String,
    pub created: String,
    pub updated: String,
}

#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct LLMParameters {
    pub context_length: u32,
    pub provider: ModelProvider,
    pub model_classification: BitModelClassification,
}

#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct VLMParameters {
    pub context_length: u32,
    pub provider: ModelProvider,
    pub model_classification: BitModelClassification,
}

#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct BitPack {
    pub bits: Vec<Bit>,
}

async fn collect_dependencies(
    bit: &Bit,
    state: Arc<Mutex<FlowLikeState>>,
) -> flow_like_types::Result<Vec<Bit>> {
    let http_client = state.lock().await.http_client.clone();
    let hub = crate::hub::Hub::new(&bit.hub, http_client.clone()).await?;
    let bit_id = bit.id.clone();
    let bits = hub.get_bit_dependencies(&bit_id).await?;
    Ok(bits)
}

impl BitPack {
    pub async fn get_installed(
        &self,
        state: Arc<Mutex<FlowLikeState>>,
    ) -> flow_like_types::Result<Vec<Bit>> {
        let bits_store = FlowLikeState::bit_store(&state).await?.as_generic();

        let mut installed_bits = vec![];
        for bit in self.bits.iter() {
            let file_name = match bit.file_name.clone() {
                Some(file_name) => Some(file_name),
                None => continue,
            };
            let file_name = file_name.unwrap();
            let bit_path = Path::from(bit.hash.clone()).child(file_name);
            let meta = match bits_store.head(&bit_path).await {
                Ok(meta) => meta,
                Err(_) => continue,
            };

            let size = meta.size as u64;
            if size != bit.size.unwrap_or(0) {
                continue;
            }
            installed_bits.push(bit.clone());
        }
        Ok(installed_bits)
    }

    pub async fn download(
        &self,
        state: Arc<Mutex<FlowLikeState>>,
        callback: InterComCallback,
    ) -> flow_like_types::Result<Vec<Bit>> {
        let mut deduplicated_bits = vec![];
        let mut deduplication_helper = HashSet::new();
        self.bits.iter().for_each(|bit| {
            if deduplication_helper.contains(&bit.hash)
                || bit.download_link.is_none()
                || bit.size.is_none()
                || bit.file_name.is_none()
            {
                println!(
                    "Skipping bit {}: already downloaded or missing required fields",
                    bit.id
                );
                return;
            }

            if bit.size.unwrap_or(0) == 0 {
                println!("Skipping bit {}: size is zero, cannot download", bit.id);
                return;
            }

            deduplicated_bits.push(bit.clone());
            deduplication_helper.insert(bit.hash.clone());
        });

        if deduplicated_bits.is_empty() {
            println!("No bits to download");
            return Ok(vec![]);
        }

        println!(
            "Downloading {} bits: {}",
            deduplicated_bits.len(),
            deduplicated_bits
                .iter()
                .map(|bit| bit.id.clone())
                .collect::<Vec<_>>()
                .join(", ")
        );

        let download_futures: Vec<_> = deduplicated_bits
            .iter()
            .map(|bit| download_bit(bit, state.clone(), 3, &callback))
            .collect();

        let results = futures::future::join_all(download_futures).await;

        for result in results {
            match result {
                Ok(_) => println!("Download succeeded"),
                Err(e) => eprintln!("Download failed: {}", e),
            }
        }

        Ok(deduplicated_bits)
    }

    pub fn size(&self) -> u64 {
        let mut size = 0;
        for bit in self.bits.iter() {
            if bit.size.is_some() {
                size += bit.size.unwrap();
            }
        }
        size
    }

    pub async fn is_installed(
        &self,
        state: Arc<Mutex<FlowLikeState>>,
    ) -> flow_like_types::Result<bool> {
        let bits_store = FlowLikeState::bit_store(&state).await?.as_generic();
        let mut installed = true;
        for bit in self.bits.iter() {
            let file_name = match bit.file_name.clone() {
                Some(file_name) => file_name,
                None => {
                    installed = false;
                    break;
                }
            };
            let bit_path = Path::from(bit.hash.clone()).child(file_name);
            let metadata = match bits_store.head(&bit_path).await {
                Ok(metadata) => metadata,
                Err(_) => {
                    installed = false;
                    break;
                }
            };
            if metadata.size as u64 != bit.size.unwrap_or(0) {
                installed = false;
                break;
            }
        }
        Ok(installed)
    }
}

impl Bit {
    pub fn try_to_llm(&self) -> Option<LLMParameters> {
        if self.bit_type == BitTypes::Llm {
            let parameters =
                flow_like_types::json::from_value::<LLMParameters>(self.parameters.clone());
            if parameters.is_err() {
                return None;
            }
            return Some(parameters.unwrap());
        }
        None
    }

    pub fn try_to_vlm(&self) -> Option<VLMParameters> {
        if self.bit_type == BitTypes::Vlm {
            let parameters =
                flow_like_types::json::from_value::<VLMParameters>(self.parameters.clone());
            if parameters.is_err() {
                return None;
            }
            return Some(parameters.unwrap());
        }
        None
    }

    pub fn score(&self, preference: &BitModelPreference) -> flow_like_types::Result<f32> {
        if let Some(parameters) = self.try_to_llm() {
            return Ok(parameters.model_classification.score(preference, self));
        }

        if let Some(parameters) = self.try_to_vlm() {
            return Ok(parameters.model_classification.score(preference, self));
        }

        Err(flow_like_types::anyhow!("Not a Model"))
    }

    pub fn try_to_embedding(&self) -> Option<EmbeddingModelProvider> {
        if self.bit_type == BitTypes::Embedding {
            let parameters = flow_like_types::json::from_value::<EmbeddingModelProvider>(
                self.parameters.clone(),
            );
            if parameters.is_err() {
                return None;
            }
            return Some(parameters.unwrap());
        }
        None
    }

    pub fn try_to_image_embedding(&self) -> Option<ImageEmbeddingModelProvider> {
        if self.bit_type == BitTypes::ImageEmbedding {
            let parameters = flow_like_types::json::from_value::<ImageEmbeddingModelProvider>(
                self.parameters.clone(),
            );
            if parameters.is_err() {
                return None;
            }
            return Some(parameters.unwrap());
        }
        None
    }

    pub fn try_to_provider(&self) -> Option<ModelProvider> {
        if let Some(parameters) = self.try_to_llm() {
            return Some(parameters.provider);
        }

        if let Some(parameters) = self.try_to_vlm() {
            return Some(parameters.provider);
        }

        None
    }

    pub fn try_to_embedding_provider(&self) -> Option<ModelProvider> {
        if let Some(parameters) = self.try_to_embedding() {
            return Some(parameters.provider);
        }

        if let Some(parameters) = self.try_to_image_embedding() {
            return Some(parameters.provider);
        }

        None
    }

    pub fn try_to_context_length(&self) -> Option<u32> {
        if let Some(parameters) = self.try_to_llm() {
            return Some(parameters.context_length);
        }

        if let Some(parameters) = self.try_to_vlm() {
            return Some(parameters.context_length);
        }

        None
    }

    pub async fn dependencies(
        &self,
        state: Arc<Mutex<FlowLikeState>>,
    ) -> flow_like_types::Result<BitPack> {
        let bits_store = FlowLikeState::bit_store(&state).await?.as_generic();

        let cache_dir =
            Path::from("deps-cache").child(format!("bit-deps-{}.bin", self.dependency_tree_hash));

        let metadata = bits_store.head(&cache_dir).await;

        if metadata.is_ok() {
            let file = from_compressed_json::<BitPack>(bits_store.clone(), cache_dir.clone()).await;
            if let Ok(file) = file {
                return Ok(file);
            }
        }

        let dependencies = collect_dependencies(self, state.clone()).await?;

        println!("Dependencies for {} found", self.id);

        let bit_pack = BitPack { bits: dependencies };
        let res = compress_to_file_json(bits_store, cache_dir, &bit_pack).await;
        if res.is_err() {
            println!(
                "Failed to compress dependencies for {}, err: {}",
                self.id,
                res.err().unwrap()
            );
        }

        Ok(bit_pack)
    }

    pub async fn pack(&self, state: Arc<Mutex<FlowLikeState>>) -> flow_like_types::Result<BitPack> {
        let mut dependencies = self.dependencies(state).await?;
        dependencies.bits.push(self.clone());
        Ok(dependencies)
    }

    pub async fn is_installed(
        &self,
        state: Arc<Mutex<FlowLikeState>>,
    ) -> flow_like_types::Result<bool> {
        let pack = self.pack(state.clone()).await?;
        pack.is_installed(state).await
    }

    pub fn is_multimodal(&self) -> bool {
        self.bit_type == BitTypes::Vlm || self.bit_type == BitTypes::ImageEmbedding
    }

    pub fn to_path(&self, file_system: &Arc<LocalObjectStore>) -> Option<PathBuf> {
        let file_name = self.file_name.clone()?;
        let bit_path = Path::from(self.hash.clone()).child(file_name);
        let path = file_system.path_to_filesystem(&bit_path).ok()?;
        Some(path)
    }
}
