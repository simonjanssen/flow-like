use std::collections::HashMap;

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use super::{
    execution::LogLevel,
    node::{Node, NodeLogic},
    pin::Pin,
    variable::Variable,
};
use crate::{
    app::App,
    state::FlowLikeState,
    utils::{
        compression::{compress_to_file, from_compressed},
        hash::hash_string_non_cryptographic,
    },
};

#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub enum ReleaseNotes {
    NOTES(String),
    URL(String),
}

#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct CanaryRelease {
    pub weight: f32,
    pub variables: HashMap<String, Variable>,
    pub board_id: String,
    pub board_version: Option<(u32, u32, u32)>,
    pub node_id: String,
    pub created_at: std::time::SystemTime,
    pub updated_at: std::time::SystemTime,
}

#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct Release {
    pub id: String,
    pub name: String,
    pub description: String,
    pub board_id: String,
    pub board_version: Option<(u32, u32, u32)>,
    pub node_id: String,
    pub variables: HashMap<String, Variable>,
    pub config: Vec<u8>,
    pub active: bool,

    pub canary: Option<CanaryRelease>,

    pub notes: Option<ReleaseNotes>,
    pub release_version: (u32, u32, u32),
    pub created_at: std::time::SystemTime,
    pub updated_at: std::time::SystemTime,
}
