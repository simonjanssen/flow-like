use flow_like::flow::node::NodeLogic;
use std::sync::Arc;

pub mod contrast;
pub mod convert;
pub mod crop;
pub mod resize;

/// Image-Transform Nodes
pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    let nodes: Vec<Arc<dyn NodeLogic>> = vec![
        Arc::new(convert::ConvertImageNode::default()),
        Arc::new(contrast::ContrastImageNode::default()),
        Arc::new(crop::CropImageNode::default()),
        Arc::new(resize::ResizeImageNode::default()),
    ];
    nodes
}
