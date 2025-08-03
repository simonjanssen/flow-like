use flow_like::{
    flow::{
        execution::context::ExecutionContext,
        node::{Node, NodeLogic},
        pin::PinOptions,
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_model_provider::response::Response;
use flow_like_types::async_trait;

#[derive(Default)]
pub struct PushToolOutputNode {}

impl PushToolOutputNode {
    pub fn new() -> Self {
        PushToolOutputNode {}
    }
}

#[async_trait]
impl NodeLogic for PushToolOutputNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "event_push_tool_output",
            "Push Tool Output",
            "Pushes a response to the chat",
            "Events/Chat",
        );
        node.add_icon("/flow/icons/event.svg");
        node.set_event_callback(true);

        node.add_input_pin(
            "exec_in",
            "Input",
            "Initiate Execution",
            VariableType::Execution,
        );

        node.add_input_pin(
            "tool_output",
            "Tool Output",
            "Tool Output",
            VariableType::String,
        );

        node.add_output_pin(
            "exec_out",
            "Output",
            "Done with the Execution",
            VariableType::Execution,
        );
        node
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        context.deactivate_exec_pin("exec_out").await?;
        context.activate_exec_pin("exec_out").await?;
        Ok(())
    }
}
