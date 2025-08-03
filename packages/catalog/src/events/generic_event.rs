use flow_like::{
    flow::{
        execution::context::ExecutionContext,
        node::{Node, NodeLogic},
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_types::async_trait;

#[derive(Default)]
pub struct GenericEventNode {}

impl GenericEventNode {
    pub fn new() -> Self {
        GenericEventNode {}
    }
}

#[async_trait]
impl NodeLogic for GenericEventNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "events_generic",
            "Generic Event",
            "A generic event without input or output",
            "Events",
        );
        node.add_icon("/flow/icons/event.svg");
        node.set_start(true);

        node.add_output_pin(
            "exec_out",
            "Output",
            "Starting an event",
            VariableType::Execution,
        );

        node.add_output_pin(
            "payload",
            "Payload",
            "The payload of the event",
            VariableType::Struct,
        );

        return node;
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        let exec_out_pin = context.get_pin_by_name("exec_out").await?;

        if context.delegated {
            context.activate_exec_pin_ref(&exec_out_pin).await?;
            return Ok(());
        }

        let payload = context.get_payload().await?;
        let payload = payload
            .payload
            .clone()
            .ok_or_else(|| flow_like_types::anyhow!("Payload is missing",))?;

        context.set_pin_value("payload", payload).await?;
        context.activate_exec_pin_ref(&exec_out_pin).await?;

        return Ok(());
    }
}
