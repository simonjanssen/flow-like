use flow_like::{models::llm::ExecutionSettings, profile::Profile as FlowLikeProfile};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Hash, PartialEq, Eq)]
pub struct UserProfile {
    #[serde(default)]
    pub hub_profile: FlowLikeProfile,

    #[serde(default)]
    pub execution_settings: ExecutionSettings,

    pub updated: String,
    pub created: String,
}

impl UserProfile {
    pub fn new(profile: FlowLikeProfile) -> Self {
        UserProfile {
            hub_profile: profile,
            execution_settings: ExecutionSettings::new(),
            updated: String::new(),
            created: String::new(),
        }
    }
}
