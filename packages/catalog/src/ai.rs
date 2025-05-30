pub mod generative;
/// Machine Learning Nodes
pub mod ml;
pub mod processing;

use flow_like::flow::node::NodeLogic;
use std::sync::Arc;

pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    let mut registry: Vec<Arc<dyn NodeLogic>> = Vec::new();

    registry.extend(generative::register_functions().await);
    registry.extend(processing::register_functions().await);
    registry.extend(ml::register_functions().await);
    registry
}
