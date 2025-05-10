pub mod html_to_md;

use flow_like::flow::node::NodeLogic;
use std::sync::Arc;

pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    let items: Vec<Arc<dyn NodeLogic>> = vec![
        Arc::new(html_to_md::HTMLToMarkdownNode::default()),
    ];

    items
}
