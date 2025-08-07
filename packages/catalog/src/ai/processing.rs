pub mod docling;

use flow_like::flow::node::NodeLogic;
use std::sync::Arc;

pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    vec![Arc::new(docling::DoclingNode::default()) as Arc<dyn NodeLogic>]
}
