use flow_like::{
    flow::{
        board::Board,
        execution::context::ExecutionContext,
        node::{Node, NodeLogic},
        pin::ValueType,
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_types::{Value, async_trait, json::json};
use std::sync::Arc;

#[derive(Default)]
pub struct ClearArrayNode {}

impl ClearArrayNode {
    pub fn new() -> Self {
        ClearArrayNode {}
    }
}

#[async_trait]
impl NodeLogic for ClearArrayNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "array_clear",
            "Clear Array",
            "Removes all elements from an array",
            "Utils/Array",
        );

        node.add_icon("/flow/icons/grip.svg");

        node.add_input_pin("exec_in", "In", "", VariableType::Execution);

        node.add_input_pin("array_in", "Array", "Your Array", VariableType::Generic)
            .set_value_type(ValueType::Array);

        node.add_output_pin("exec_out", "Out", "", VariableType::Execution);

        node.add_output_pin("array_out", "Array", "Empty Array", VariableType::Generic)
            .set_value_type(ValueType::Array);

        return node;
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        let array_out: Vec<Value> = Vec::new();

        context.set_pin_value("array_out", json!(array_out)).await?;
        context.activate_exec_pin("exec_out").await?;

        Ok(())
    }

    async fn on_update(&self, node: &mut Node, board: Arc<Board>) {
        let _ = node.match_type("array_in", board.clone(), Some(ValueType::Array), None);
        let _ = node.match_type("array_out", board.clone(), Some(ValueType::Array), None);
        node.harmonize_type(vec!["array_in", "array_out"], true);
    }
}
