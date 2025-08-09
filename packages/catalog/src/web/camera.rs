use std::sync::Arc;

use flow_like::flow::node::NodeLogic;

pub mod grab_frame;

pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    let out: Vec<Arc<dyn NodeLogic>> = vec![Arc::new(grab_frame::GrabFrameNode::default())];

    out
}
