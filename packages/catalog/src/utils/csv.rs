use flow_like::flow::node::NodeLogic;
use std::sync::Arc;

pub mod buffered_reader;
pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    vec![Arc::new(buffered_reader::BufferedCsvReaderNode::default())]
}
