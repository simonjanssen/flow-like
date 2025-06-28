use flow_like::{
    bit::Bit,
    flow::{
        execution::{
            LogLevel,
            context::ExecutionContext,
            internal_node::InternalNode,
            log::{LogMessage, LogStat},
        },
        node::{Node, NodeLogic},
        pin::PinOptions,
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_model_provider::{
    history::History, llm::LLMCallback, response::Response, response_chunk::ResponseChunk,
};
use flow_like_types::{async_trait, json::json};

#[derive(Default)]
pub struct LLMWithStructuredOutput {}

impl LLMWithStructuredOutput {
    pub fn new() -> Self {
        LLMWithStructuredOutput {}
    }
}

#[async_trait]
impl NodeLogic for LLMWithStructuredOutput {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "with_structured_output",
            "With Structured Output",
            "LLM Invoke with Structured Output",
            "AI/Generative",
        );
        node.add_icon("/flow/icons/bot-invoke.svg");

        node.add_input_pin("exec_in", "Input", "Trigger Pin", VariableType::Execution);

        node.add_input_pin("model", "Model", "Model", VariableType::Struct)
            .set_schema::<Bit>()
            .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_input_pin("history", "History", "Chat History", VariableType::Struct)
            .set_schema::<History>()
            .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_input_pin(
            "schema",
            "Schema",
            "JSON or OpenAI Schema",
            VariableType::Struct,
        );

        node.add_output_pin(
            "exec_out",
            "Execution Output",
            "Execution Output",
            VariableType::Execution,
        );

        node.add_output_pin(
            "response",
            "Response",
            "Structured Response",
            VariableType::Struct,
        );

        return node;
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        context.deactivate_exec_pin("exec_out").await?;
        context.log_message("node started", LogLevel::Debug);
        context.activate_exec_pin("exec_out").await?;
        Ok(())
    }
}
