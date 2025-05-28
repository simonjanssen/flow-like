use crate::{error::ApiError, middleware::jwt::AppUser, state::AppState};
use axum::{Extension, Json, extract::State};
use flow_like::flow::node::Node;

#[tracing::instrument(name = "GET /app/nodes", skip(state, user))]
pub async fn get_nodes(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
) -> Result<Json<Vec<Node>>, ApiError> {
    user.sub()?;
    let nodes = state.registry.as_ref();
    let nodes = nodes.get_nodes();

    Ok(Json(nodes))
}
