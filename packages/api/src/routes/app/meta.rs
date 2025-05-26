use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Meta {
    pub lang: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub long_description: Option<String>,
    pub tags: Option<Vec<String>>,
}
