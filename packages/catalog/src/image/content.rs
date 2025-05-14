use flow_like::flow::node::NodeLogic;
use std::sync::Arc;

pub mod read_barcodes;
pub mod read_from_path;
pub mod read_from_url;
pub mod write_to_path;

/// Content-Related Image Nodes
pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    let nodes: Vec<Arc<dyn NodeLogic>> = vec![
        Arc::new(read_barcodes::ReadBarcodesNode::default()),
        Arc::new(read_from_path::ReadImagePathNode::default()),
        Arc::new(read_from_url::ReadImageFromUrlNode::default()),
        Arc::new(write_to_path::WriteImageNode::default()),
    ];
    nodes
}
