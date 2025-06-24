use crate::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};
use billing::get_billing_session;
use info::user_info;

pub mod billing;
pub mod get_invites;
pub mod info;
pub mod lookup;
pub mod manage_invite;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/info", get(user_info))
        .route("/billing", get(get_billing_session))
        .route("/lookup/{query}", get(lookup::user_lookup))
        .route("/invites", get(get_invites::get_invites))
        .route(
            "/invites/{invite_id}",
            post(manage_invite::accept_invite).delete(manage_invite::decline_invite),
        )
}
