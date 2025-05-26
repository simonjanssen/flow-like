use crate::state::AppState;
use axum::{Router, routing::get};
use billing::get_billing_session;
use info::user_info;

pub mod billing;
pub mod info;
pub mod lookup;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/info", get(user_info))
        .route("/billing", get(get_billing_session))
        .route("/lookup/{query}", get(lookup::user_lookup))
}
