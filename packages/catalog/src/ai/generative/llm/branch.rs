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
use flow_like_types::{async_trait, json::json};

#[derive(Default)]
pub struct LLMBranchNode {}

impl LLMBranchNode {
    pub fn new() -> Self {
        LLMBranchNode {}
    }
}

#[async_trait]
impl NodeLogic for LLMBranchNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "llm_branch",
            "LLM Branch",
            "LLM If-Else Router",
            "AI/Generative",
        );
        node.add_icon("/flow/icons/split.svg");

        node.add_input_pin("exec_in", "Input", "Trigger Pin", VariableType::Execution);

        node.add_input_pin("model", "Model", "Model", VariableType::Struct)
            .set_schema::<Bit>()
            .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_input_pin("prompt", "Prompt", "", VariableType::String)
            .set_default_value(Some(json!("")));

        node.add_output_pin(
            "true",
            "True",
            "The flow to follow if the condition is true",
            VariableType::Execution,
        );
        node.add_output_pin(
            "false",
            "False",
            "The flow to follow if the condition is false",
            VariableType::Execution,
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
