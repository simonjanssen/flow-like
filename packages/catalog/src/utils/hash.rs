use flow_like::flow::node::NodeLogic;
use std::sync::Arc;

pub mod ahash;
pub mod blake3;

pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    let items: Vec<Arc<dyn NodeLogic>> = vec![
        Arc::new(ahash::AHashNode::default()),
        Arc::new(blake3::Blake3Node::default()),
    ];

    items
}
