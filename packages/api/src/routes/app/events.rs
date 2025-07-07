pub mod delete_event;
pub mod get_event;
pub mod get_event_versions;
pub mod get_events;
pub mod upsert_event;
pub mod upsert_event_feedback;
pub mod validate_event;

use axum::{
    Router,
    routing::{get, patch, post, put},
};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(get_events::get_events))
        .route(
            "/{event_id}",
            get(get_event::get_event)
                .put(upsert_event::upsert_event)
                .delete(delete_event::delete_event),
        )
        .route(
            "/{event_id}/versions",
            get(get_event_versions::get_event_versions),
        )
        .route("/{event_id}/validate", post(validate_event::validate_event))
        .route(
            "/{board_id}/feedback",
            put(upsert_event_feedback::upsert_event_feedback),
        )
}
