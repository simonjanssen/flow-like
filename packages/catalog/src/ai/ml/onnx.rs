/// # ONNX Nodes
/// Loading and Inference for ONNX-based Models
use flow_like::flow::{execution::context::ExecutionContext, node::NodeLogic};
use flow_like_model_provider::ml::ort::session::Session;
use flow_like_types::{Cacheable, Result, create_id, sync::Mutex};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// ONNX Image Classification Nodes
pub mod classify;
/// ONNX Image Object Detection Nodes
pub mod detect;
/// ONNX Image Feature Extractor Nodes
pub mod feature;
/// ONNX Model Loader Nodes
pub mod load;

#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug)]
/// ONNX Runtime Session Reference
pub struct NodeOnnxSession {
    /// Cache ID for Session
    pub session_ref: String,
}

/// ONNX Runtime Session Wrapper
pub struct NodeOnnxSessionWrapper {
    /// Shared Mutable ONNX Runtime Session
    /// Todo: we might not need a Mutex?
    pub session: Arc<Mutex<Session>>,
}

impl Cacheable for NodeOnnxSessionWrapper {
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

impl NodeOnnxSession {
    /// Push new ONNX Runtime Session to Execution Context
    pub async fn new(ctx: &mut ExecutionContext, session: Session) -> Self {
        let id = create_id();
        let session_ref = Arc::new(Mutex::new(session));
        let wrapper = NodeOnnxSessionWrapper {
            session: session_ref.clone(),
        };
        ctx.cache
            .write()
            .await
            .insert(id.clone(), Arc::new(wrapper));
        NodeOnnxSession { session_ref: id }
    }

    /// ONNX Sessions don't implement copy trait
    /// We just need an immut reference to session for execution
    /// So get_session should be sufficient
    // pub async fn copy_session(&self, ctx: &mut ExecutionContext) -> Result<Self> {
    //     let session = ctx
    //         .cache
    //         .read()
    //         .await
    //         .get(&self.session_ref)
    //         .cloned()
    //         .ok_or_else(|| flow_like_types::anyhow!("ONNX session not found in cache!"))?;

    //     let session_wrapper = session
    //         .as_any()
    //         .downcast_ref::<NodeOnnxSessionWrapper>()
    //         .ok_or_else(|| flow_like_types::anyhow!("Could not downcast to NodeOnnxSessionWrapper!"))?;

    //     let session = session_wrapper
    //         .session
    //         .lock()
    //         .await
    //         .clone();
    //     let new_id = create_id();
    //     let new_session_ref = Arc::new(Mutex::new(session.clone()));
    //     let new_wrapper = NodeOnnxSessionWrapper {
    //         session: new_session_ref.clone(),
    //     };
    //     ctx
    //         .cache
    //         .write()
    //         .await
    //         .insert(new_id.clone(), Arc::new(new_wrapper));
    //     let new_session = NodeOnnxSession { session_ref: new_id };
    //     Ok(new_session)
    // }

    /// Fetch ONNX Runtime Session from Cached Runtime Context
    pub async fn get_session(&self, ctx: &mut ExecutionContext) -> Result<Arc<Mutex<Session>>> {
        let session = ctx
            .cache
            .read()
            .await
            .get(&self.session_ref)
            .cloned()
            .ok_or_else(|| flow_like_types::anyhow!("ONNX session not found in cache!"))?;
        let session_wrapper = session
            .as_any()
            .downcast_ref::<NodeOnnxSessionWrapper>()
            .ok_or_else(|| {
                flow_like_types::anyhow!("Could not downcast to NodeOnnxSessionWrapper")
            })?;
        let session = session_wrapper.session.clone();
        Ok(session)
    }
}

/// Add ONNX-related Nodes to Catalog Lib
pub async fn register_functions() -> Vec<Arc<dyn NodeLogic>> {
    let nodes: Vec<Arc<dyn NodeLogic>> = vec![
        Arc::new(load::LoadOnnxNode::default()),
        Arc::new(detect::ObjectDetectionNode::default()),
    ];
    nodes
}
