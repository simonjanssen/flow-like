use serde::{Deserialize, Serialize};

pub mod admin;
pub mod app;
pub mod auth;
pub mod bit;
pub mod health;
pub mod info;
pub mod profile;
pub mod store;
pub mod user;

#[derive(Clone, Deserialize, Serialize, Debug)]
pub struct LanguageParams {
    pub language: Option<String>,
}
