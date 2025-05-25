use axum::body::Body;
use flow_like_types::bail;
use flow_like_types::{Result, Value};
use hyper_util::{
    client::legacy::{Client, connect::HttpConnector},
    rt::TokioExecutor,
};
use jsonwebtoken::{
    DecodingKey, Validation, decode,
    jwk::{AlgorithmParameters, JwkSet},
};
use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Arc, time::Duration};

pub type AppState = Arc<State>;

const CONFIG: &str = include_str!("../../../api.config.json");
const JWKS: &str = include_str!(concat!(env!("OUT_DIR"), "/jwks.json"));

pub struct State {
    pub platform_config: PlatformConfig,
    pub db: DatabaseConnection,
    pub jwks: JwkSet,
    pub client: Client<HttpConnector, Body>,
    pub stripe_client: Option<stripe::Client>,
}

impl State {
    pub async fn new() -> Self {
        let platform_config: PlatformConfig =
            serde_json::from_str(CONFIG).expect("Failed to parse config file");

        let jwks = flow_like_types::json::from_str::<JwkSet>(JWKS).expect("Failed to parse JWKS");

        let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let mut opt = ConnectOptions::new(db_url.to_owned());
        let client: Client<HttpConnector, Body> =
            hyper_util::client::legacy::Client::<(), ()>::builder(TokioExecutor::new())
                .build(HttpConnector::new());
        opt.max_connections(100)
            .min_connections(5)
            .connect_timeout(Duration::from_secs(8))
            .sqlx_logging(platform_config.environment == Environment::Development);

        let db = Database::connect(opt)
            .await
            .expect("Failed to connect to database");

        let stripe_client = if platform_config.features.premium {
            let stripe_key =
                std::env::var("STRIPE_SECRET_KEY").expect("STRIPE_SECRET_KEY must be set");
            let stripe_client = stripe::Client::new(stripe_key);
            Some(stripe_client)
        } else {
            None
        };

        Self {
            platform_config,
            db,
            client,
            jwks,
            stripe_client,
        }
    }

    pub fn validate_token(&self, token: &str) -> Result<HashMap<String, Value>> {
        let header = jsonwebtoken::decode_header(token)?;
        let Some(kid) = header.kid else {
            return Err(flow_like_types::anyhow!("Missing kid in token header"));
        };
        let Some(jwk) = self.jwks.find(&kid) else {
            return Err(flow_like_types::anyhow!("JWK not found for kid: {}", kid));
        };
        let alg = decoding_key_for_algorithm(&jwk.algorithm)?;
        let mut validation = Validation::new(header.alg);
        validation.validate_aud = false;
        let decoded = decode::<HashMap<String, Value>>(token, &alg, &validation)?;
        let claims = decoded.claims;
        Ok(claims)
    }
}

fn decoding_key_for_algorithm(alg: &AlgorithmParameters) -> flow_like_types::Result<DecodingKey> {
    let key = match alg {
        AlgorithmParameters::RSA(rsa) => DecodingKey::from_rsa_components(&rsa.n, &rsa.e),
        AlgorithmParameters::EllipticCurve(ec) => DecodingKey::from_ec_components(&ec.x, &ec.y),
        AlgorithmParameters::OctetKeyPair(octet) => DecodingKey::from_ed_components(&octet.x),
        _ => bail!("Unsupported algorithm"),
    }?;
    Ok(key)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PlatformConfig {
    pub authentication: Option<Authentication>,
    pub features: Features,
    pub hubs: Vec<String>, // Assuming hubs might contain strings, adjust if needed
    pub provider: Option<String>,
    pub domain: Option<String>,
    pub region: Option<String>,
    pub terms_of_service: String,
    pub legal_notice: String,
    pub privacy_policy: String,
    pub contact: Contact,
    pub max_users_prototype: Option<i32>,
    pub default_user_plan: Option<String>,
    pub environment: Environment,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum Environment {
    Development,
    Production,
    Staging,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Authentication {
    pub variant: String,
    pub openid: Option<OpenIdConfig>,
    pub oauth2: Option<OAuth2Config>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenIdProxy {
    pub enabled: bool,
    pub authorize: Option<String>,
    pub token: Option<String>,
    pub userinfo: Option<String>,
    pub revoke: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CognitoConfig {
    pub user_pool_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenIdConfig {
    pub authority: Option<String>,
    pub client_id: Option<String>,
    pub redirect_uri: Option<String>,
    pub post_logout_redirect_uri: Option<String>,
    pub response_type: Option<String>,
    pub scope: Option<String>,
    pub discovery_url: Option<String>,
    pub jwks_url: String,
    pub proxy: Option<OpenIdProxy>,
    pub cognito: Option<CognitoConfig>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OAuth2Config {
    pub authorization_endpoint: String,
    pub token_endpoint: String,
    pub client_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Features {
    pub model_hosting: bool,
    pub flow_hosting: bool,
    pub governance: bool,
    pub ai_act: bool,
    pub unauthorized_read: bool,
    pub admin_interface: bool,
    pub premium: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contact {
    pub name: String,
    pub email: String,
    pub url: String,
}
