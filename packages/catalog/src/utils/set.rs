use flow_like::flow::node::NodeLogic;
use std::sync::Arc;

pub mod to_array;

pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    vec![Arc::new(to_array::SetToArrayNode::default())]
}
