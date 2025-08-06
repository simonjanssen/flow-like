pub mod api;
pub mod camera;
pub mod scrape;

use flow_like::flow::node::NodeLogic;
use std::sync::Arc;

pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    let mut out = Vec::new();

    out.extend(api::register_functions().await);
    out.extend(scrape::register_functions().await);
    out.extend(camera::register_functions().await);

    out
}
