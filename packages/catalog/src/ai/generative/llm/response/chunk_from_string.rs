/// # Chunk From String Node
/// Transform custom input strings into chunk objects that can be pushed as continuous, intermediate results to frontend.
/// Useful when intermediate steps are not LLM tokens but action steps performed by tools etc.
use flow_like::{
    flow::{
        execution::context::ExecutionContext,
        node::{Node, NodeLogic},
        pin::PinOptions,
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_model_provider::response_chunk::{Delta, ResponseChunk, ResponseChunkChoice};
use flow_like_types::{async_trait, json::json};

#[derive(Default)]
pub struct ChunkFromStringNode {}

impl ChunkFromStringNode {
    pub fn new() -> Self {
        ChunkFromStringNode {}
    }
}

#[async_trait]
impl NodeLogic for ChunkFromStringNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "ai_generative_llm_chunk_from_string",
            "Chunk From String",
            "Make New Chunk Object From String Input",
            "AI/Generative/Response",
        );
        node.add_icon("/flow/icons/history.svg");

        node.add_input_pin("content", "Content", "Content", VariableType::String)
            .set_default_value(Some(json!("")));

        node.add_output_pin(
            "chunk",
            "Chunk",
            "Chunk from Input String",
            VariableType::Struct,
        )
        .set_schema::<ResponseChunk>()
        .set_options(PinOptions::new().set_enforce_schema(true).build());

        return node;
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        // fetch inputs
        let message: String = context.evaluate_pin("content").await?;

        // make chunk
        let mut chunk = ResponseChunk::default();
        chunk.choices.push(ResponseChunkChoice {
            finish_reason: None,
            index: 0,
            logprobs: None,
            delta: Some(Delta {
                role: Some("assistant".to_string()),
                content: Some(message),
                tool_calls: None,
                refusal: None,
            }),
        });

        // set outputs
        context.set_pin_value("chunk", json!(chunk)).await?;
        Ok(())
    }
}
