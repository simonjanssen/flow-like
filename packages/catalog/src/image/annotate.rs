use flow_like::flow::node::NodeLogic;
use std::sync::Arc;

pub mod draw_boxes;
pub mod make_box;

/// Content-Related Image Nodes
pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    let nodes: Vec<Arc<dyn NodeLogic>> = vec![
        Arc::new(draw_boxes::DrawBoxesNode::default()),
        Arc::new(make_box::MakeBoxNode::default()),
    ];
    nodes
}
