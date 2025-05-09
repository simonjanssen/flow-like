use flow_like::{
    flow::{
        execution::context::ExecutionContext,
        node::{Node, NodeLogic},
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_types::{async_trait, json::json};

#[derive(Default)]
pub struct StringToUpperNode {}

impl StringToUpperNode {
    pub fn new() -> Self {
        StringToUpperNode {}
    }
}

#[async_trait]
impl NodeLogic for StringToUpperNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "string_to_upper",
            "To Upper Case",
            "Converts a string to uppercase",
            "Utils/String",
        );
        node.add_icon("/flow/icons/string.svg");

        node.add_input_pin("string", "String", "Input String", VariableType::String);

        node.add_output_pin(
            "uppercase_string",
            "Uppercase String",
            "String in uppercase",
            VariableType::String,
        );

        return node;
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        let string: String = context.evaluate_pin("string").await?;
        let uppercase_string = string.to_uppercase();

        context
            .set_pin_value("uppercase_string", json!(uppercase_string))
            .await?;
        Ok(())
    }
}
