use flow_like::{
    flow::{
        execution::{LogLevel, context::ExecutionContext},
        node::{Node, NodeLogic},
        variable::VariableType,
    },
    state::FlowLikeState,
    utils::json::parse_malformed_json,
};
use flow_like_types::async_trait;

#[derive(Default)]
pub struct ValidateSchemaNode {}

impl ValidateSchemaNode {
    pub fn new() -> Self {
        ValidateSchemaNode {}
    }
}

#[async_trait]
impl NodeLogic for ValidateSchemaNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "validate_schema",
            "Parse JSON with Schema",
            "Parse JSON and Validate against Schema",
            "Utils/JSON",
        );

        node.add_icon("/flow/icons/repair.svg");

        node.add_input_pin(
            "exec_in",
            "Input",
            "Initiate Execution",
            VariableType::Execution,
        );

        node.add_input_pin(
            "schema",
            "JSON Schema",
            "JSON Schema Model Definition",
            VariableType::Struct,
        );

        node.add_input_pin(
            "json_string",
            "JSON String",
            "String containing potentially malformed JSON",
            VariableType::String,
        );

        node.add_output_pin(
            "exec_out",
            "Output",
            "Execution continues if parsing succeeds",
            VariableType::Execution,
        );

        node.add_output_pin(
            "validated",
            "Validated",
            "Parsed and Validated JSON",
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
