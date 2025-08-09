pub mod imap;
pub mod smtp;

use flow_like::flow::node::NodeLogic;
use std::sync::Arc;

pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    let mut output = vec![
        Arc::new(imap::ImapConnectNode::default()) as Arc<dyn NodeLogic>,
        Arc::new(imap::inbox::list::ListMailsNode::default()) as Arc<dyn NodeLogic>,
    ];

    output.extend(imap::inbox::mail::register_functions().await);
    output.extend(imap::inbox::register_functions().await);

    output
}
