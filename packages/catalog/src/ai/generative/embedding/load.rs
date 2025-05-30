use flow_like::{
    bit::{Bit, BitTypes},
    flow::{
        execution::context::ExecutionContext,
        node::{Node, NodeLogic},
        pin::PinOptions,
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_types::{async_trait, bail, json::json};
use std::sync::Arc;

use super::{CachedEmbeddingModel, CachedEmbeddingModelObject};

#[derive(Default)]
pub struct LoadModelNode {}

impl LoadModelNode {
    pub fn new() -> Self {
        LoadModelNode {}
    }
}

#[async_trait]
impl NodeLogic for LoadModelNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "load_model",
            "Load Embedding Model",
            "Loads a model from a Bit",
            "AI/Embedding",
        );

        node.add_icon("/flow/icons/bot-invoke.svg");
        node.set_long_running(true);

        node.add_input_pin(
            "exec_in",
            "Input",
            "Initiate Execution",
            VariableType::Execution,
        );

        node.add_input_pin(
            "bit",
            "Model Bit",
            "The Bit that contains the Model",
            VariableType::Struct,
        )
        .set_schema::<Bit>()
        .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_output_pin(
            "exec_out",
            "Output",
            "Done with the Execution",
            VariableType::Execution,
        );

        node.add_output_pin("model", "Model", "Model Out", VariableType::Struct)
            .set_schema::<CachedEmbeddingModel>();

        return node;
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        context.deactivate_exec_pin("exec_out").await?;
        let bit: Bit = context.evaluate_pin("bit").await?;

        if bit.bit_type != BitTypes::Embedding && bit.bit_type != BitTypes::ImageEmbedding {
            bail!("Not an Embedding Model");
        }

        let app_state = context.app_state.clone();
        let model_factory = context.app_state.lock().await.embedding_factory.clone();

        let model = match bit.bit_type {
            BitTypes::Embedding => {
                let model = model_factory
                    .lock()
                    .await
                    .build_text(&bit, app_state)
                    .await?;

                CachedEmbeddingModelObject {
                    text_model: Some(model),
                    image_model: None,
                }
            }
            BitTypes::ImageEmbedding => {
                let model = model_factory
                    .lock()
                    .await
                    .build_image(&bit, app_state)
                    .await?;

                CachedEmbeddingModelObject {
                    text_model: None,
                    image_model: Some(model),
                }
            }
            _ => {
                bail!("Unsupported Bit Type");
            }
        };

        context.set_cache(&bit.id, Arc::new(model)).await;
        let model = CachedEmbeddingModel {
            cache_key: bit.id.clone(),
            model_type: bit.bit_type.clone(),
        };

        context.set_pin_value("model", json!(model)).await?;
        context.activate_exec_pin("exec_out").await?;

        return Ok(());
    }
}
