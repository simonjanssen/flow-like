use crate::ai::generative::embedding::{CachedEmbeddingModel, CachedEmbeddingModelObject};
use flow_like::{
    flow::{
        execution::context::ExecutionContext,
        node::{Node, NodeLogic},
        pin::{PinOptions, ValueType},
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_types::{anyhow, async_trait, bail, json::json};

#[derive(Default)]
pub struct EmbedDocumentNode {}

impl EmbedDocumentNode {
    pub fn new() -> Self {
        EmbedDocumentNode {}
    }
}

#[async_trait]
impl NodeLogic for EmbedDocumentNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "embed_document",
            "Embed Document",
            "Embeds a document string using a loaded model",
            "AI/Embedding",
        );

        node.set_long_running(true);
        node.add_icon("/flow/icons/bot-invoke.svg");

        node.add_input_pin(
            "exec_in",
            "Input",
            "Initiate Execution",
            VariableType::Execution,
        );

        node.add_input_pin(
            "query_string",
            "Query String",
            "The string to embed",
            VariableType::String,
        );

        node.add_input_pin(
            "model",
            "Model",
            "The embedding model",
            VariableType::Struct,
        )
        .set_schema::<CachedEmbeddingModel>()
        .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_output_pin(
            "exec_out",
            "Output",
            "Done with the Execution",
            VariableType::Execution,
        );

        node.add_output_pin(
            "vector",
            "Vector",
            "The embedding vector",
            VariableType::Float,
        )
        .set_value_type(ValueType::Array);

        return node;
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        context.deactivate_exec_pin("exec_out").await?;

        let query_string: String = context.evaluate_pin("query_string").await?;
        let model: CachedEmbeddingModel = context.evaluate_pin("model").await?;

        let cached_model = context.get_cache(&model.cache_key).await;
        if cached_model.is_none() {
            bail!("Model not found in cache");
        }

        let cached_model = cached_model.unwrap();
        let embedding_model = cached_model
            .as_any()
            .downcast_ref::<CachedEmbeddingModelObject>()
            .ok_or(anyhow!("Failed to Downcast Model"))?;
        let mut embeddings = vec![];

        if let Some(embedding_model) = &embedding_model.text_model {
            let vecs = embedding_model
                .text_embed_document(&vec![query_string.clone()])
                .await?;
            embeddings = vecs;
        }

        if let Some(embedding_model) = &embedding_model.image_model {
            let vecs = embedding_model
                .text_embed_document(&vec![query_string])
                .await?;
            embeddings = vecs;
        }

        if embeddings.len() <= 0 {
            bail!("Failed to embed the query");
        }

        context
            .set_pin_value("vector", json!(embeddings[0]))
            .await?;

        context.activate_exec_pin("exec_out").await?;
        Ok(())
    }
}
