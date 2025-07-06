use flow_like::{
    bit::Bit,
    flow::{
        board::Board,
        execution::{
            LogLevel,
            context::ExecutionContext,
        },
        node::{Node, NodeLogic},
        pin::{PinOptions, PinType},
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_model_provider::{
    history::History, response::Response,
};
use flow_like_types::{Value, async_trait, json};
use serde::Deserialize;
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};

#[derive(Debug, Deserialize)]
struct Tool {
    name: String,
    args: String,
}

#[derive(Default)]
pub struct LLMWithTools {}

impl LLMWithTools {
    pub fn new() -> Self {
        LLMWithTools {}
    }
}

#[async_trait]
impl NodeLogic for LLMWithTools {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "with_tools",
            "With Tool Calls",
            "LLM with Tool Calls",
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
            "tools",
            "Tools",
            "JSON or OpenAI Tool Schemas",
            VariableType::String,
        )
        .set_default_value(Some(json::json!("[]")));

        node.add_output_pin("exec_done", "Done", "Done Pin", VariableType::Execution);

        node.add_output_pin(
            "response",
            "Response",
            "Final response if not tool call made",
            VariableType::Struct,
        )
        .set_schema::<Response>()
        .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_output_pin(
            "tool_args",
            "Tool Args",
            "Tool Call Arguments",
            VariableType::Struct,
        );

        node.set_long_running(true);

        return node;
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        context.deactivate_exec_pin("exec_done").await?;
        context.log_message("LLMWithTools node started", LogLevel::Debug);

        let schema_str: String = context.evaluate_pin("tools").await?;
        let tools: Vec<Tool> = json::from_str(&schema_str)?;
        for tool in tools {
            context.log_message(
                &format!("[tool] name: {}, args: {}", tool.name, tool.args),
                LogLevel::Debug,
            );
        }
        context.activate_exec_pin("exec_done").await?;
        Ok(())
    }

    // [{"name": "Tool 1", "args": "a"}, {"name": "Tool 2", "args": "b"}]
    async fn on_update(&self, node: &mut Node, board: Arc<Board>) {
        let current_tool_exec_pins: Vec<_> = node
            .pins
            .values()
            .filter(|p| {
                p.pin_type == PinType::Output
                    && (p.name != "exec_done" && p.name != "response" && p.name != "tool_args") // p.description == "Tool Exec" doesn't seem to work as filter cond
            })
            .collect();

        let schema_str: String = node
            .get_pin_by_name("tools")
            .and_then(|pin| pin.default_value.clone())
            .and_then(|bytes| flow_like_types::json::from_slice::<Value>(&bytes).ok())
            .and_then(|json| json.as_str().map(ToOwned::to_owned))
            .unwrap_or_default();

        let mut current_tool_exec_refs = current_tool_exec_pins
            .iter()
            .map(|p| (p.name.clone(), *p))
            .collect::<HashMap<_, _>>();

        let update_tools: Vec<Tool> = match json::from_str(&schema_str) {
            Ok(value) => value,
            Err(err) => {
                node.error = Some(format!("Failed to parse tools: {err:?}").to_string());
                return;
            }
        };

        let mut all_tool_exec_refs = HashSet::new();
        let mut missing_tool_exec_refs = HashSet::new();

        for update_tool in update_tools {
            all_tool_exec_refs.insert(update_tool.name.clone());
            if current_tool_exec_refs.remove(&update_tool.name).is_none() {
                missing_tool_exec_refs.insert(update_tool.name.clone());
            }
        }

        let ids_to_remove = current_tool_exec_refs
            .values()
            .map(|p| p.id.clone())
            .collect::<Vec<_>>();
        ids_to_remove.iter().for_each(|id| {
            node.pins.remove(id);
        });

        for missing_tool_ref in missing_tool_exec_refs {
            node.add_output_pin(
                &missing_tool_ref,
                &missing_tool_ref,
                "Tool Exec",
                VariableType::Execution,
            );
        }
    }
}
