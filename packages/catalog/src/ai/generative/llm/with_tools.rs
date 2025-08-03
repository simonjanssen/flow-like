use crate::utils::json::parse_with_schema::{
    OpenAIFunction, OpenAIToolCall, validate_openai_functions_str, validate_openai_tool_call_str,
};
use flow_like::{
    bit::Bit,
    flow::{
        board::Board,
        execution::{LogLevel, context::ExecutionContext},
        node::{Node, NodeLogic},
        pin::{PinOptions, PinType},
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_model_provider::{
    history::{History, HistoryMessage, Role},
    response::Response,
};

use flow_like_types::{Error, Value, anyhow, async_trait, json, regex::Regex};
use serde::Deserialize;
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};

const SYSTEM_PROMPT_TEMPLATE: &str = r#"
# Instruction
You are a helpful assistant with access to the tools below.

# Tools
Here are the tools you *can* use:

TOOLS_STR

# Output Format
You have *two* options to answer:
- Use a tool wrapping it in <tooluse></tooluse> tags like this: <tooluse>{"name": "name of the tool", "args": ...}</tooluse>
- Reply back to user wrapping it in <replytouser></replytouser> tags like this: <replytouser>...</replytouser>
"#;

/// Extract tagged substrings, e.g. Hello, <tool>extract this</tool> and <tool>this</tool>, good bye.
pub fn extract_tagged_simple(text: &str, tag: &str) -> Result<Vec<String>, Error> {
    let pattern = format!(r"(?s)<{tag}>(.*?)</{tag}>", tag = regex::escape(tag));
    let re = Regex::new(&pattern)?;
    Ok(re
        .captures_iter(text)
        .filter_map(|caps| caps.get(1).map(|m| m.as_str().to_string()))
        .collect())
}

/// Extract tagged substrings, e.g. Hello, <tool>extract this</tool> and <tool>this</tool>, good bye.
/// This is a more robust version that ignores tags not being closed.
pub fn extract_tagged(text: &str, tag: &str) -> Result<Vec<String>, Error> {
    let open_tag  = format!("<{}>", tag);
    let close_tag = format!("</{}>", tag);

    // 1) Find all open-tag positions
    let mut starts = Vec::new();
    let mut pos = 0;
    while let Some(idx) = text[pos..].find(&open_tag) {
        let real = pos + idx;
        starts.push(real);
        pos = real + open_tag.len();
    }

    // 2) Find all close-tag positions
    let mut ends = Vec::new();
    let mut pos = 0;
    while let Some(idx) = text[pos..].find(&close_tag) {
        let real = pos + idx;
        ends.push(real);
        pos = real + close_tag.len();
    }

    // 3) For each opener, match to the first unused closer that comes after it,
    //    but only if there’s no *other* opener in between them.
    let mut used_ends = vec![false; ends.len()];
    let mut out = Vec::new();

    for &start in &starts {
        let content_start = start + open_tag.len();
        // find the first unused closing tag after this opener
        if let Some((ei, &end_pos)) = ends.iter().enumerate()
            .find(|&(i,&e)| !used_ends[i] && e > content_start)
        {
            // check for any *other* opener nested between this opener and that closer:
            let has_inner_opener = starts.iter()
                .any(|&other| other > start && other < end_pos);

            if has_inner_opener {
                // this opener is “orphaned” by an inner start—skip it
                continue;
            }

            // otherwise, we have a proper pair: extract, mark this closer used
            let slice = &text[content_start..end_pos];
            out.push(slice.to_string());
            used_ends[ei] = true;
        }
    }

    Ok(out)
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
            "JSON or OpenAI Function Definitions",
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

        // fetch inputs
        let model_bit = context.evaluate_pin::<Bit>("model").await?;
        let mut history = context.evaluate_pin::<History>("history").await?;
        let tools_str: String = context.evaluate_pin("tools").await?;

        // deactivate all function exec output pins
        let functions = validate_openai_functions_str(&tools_str)?;
        for function in &functions {
            context.deactivate_exec_pin(&function.name).await?
        }

        // log model name
        if let Some(meta) = model_bit.meta.get("en") {
            context.log_message(&format!("Loading model {:?}", meta.name), LogLevel::Debug);
        }

        // ingest system prompt with tool definitions
        let system_prompt = SYSTEM_PROMPT_TEMPLATE.replace("TOOLS_STR", &tools_str); // todo: serlialize tools instead?
        context.log_message(&system_prompt, LogLevel::Debug);
        history.set_system_prompt(system_prompt.to_string()); // todo: handle previously set system prompts

        // generate response, todo: wrap this
        let response = {
            // load model
            let model_factory = context.app_state.lock().await.model_factory.clone();
            let model = model_factory
                .lock()
                .await
                .build(&model_bit, context.app_state.clone())
                .await?;
            model.invoke(&history, None).await?
        };  // drop model

        // parse response
        let mut response_string = "".to_string();
        if let Some(response) = response.last_message() {
            response_string = response.content.clone().unwrap_or("".to_string());
        }
        context.log_message(&response_string, LogLevel::Debug);
        if response_string.contains("<tooluse>") {
            let tool_calls_str = extract_tagged(&response_string, "tooluse")?;
            let tool_calls: Result<Vec<OpenAIToolCall>, Error> = tool_calls_str
                .iter()
                .map(|tool_call_str| validate_openai_tool_call_str(&functions, tool_call_str))
                .collect();
            let mut tool_calls = tool_calls?;
            let tool_call = if tool_calls.len() == 1 {
                // todo: remove to support parallel tool calls
                tool_calls.pop().unwrap()
            } else {
                return Err(anyhow!(format!(
                    "Invalid number of tool calls: Expected 1, got {}.",
                    tool_calls.len()
                )));
            };
            context
                .set_pin_value("tool_args", json::json!(tool_call.args))
                .await?;
            context.activate_exec_pin(&tool_call.name).await?; // activate this tool call exec pin
        } else if response_string.contains("<replytouser>") {
            let mut response_tagged = extract_tagged(&response_string, "replytouser")?;
            let response_tagged = if response_tagged.len() == 1 {
                response_tagged.pop().unwrap()
            } else {
                return Err(anyhow!(format!(
                    "Invalid number of responses: Expected 1, got {}.",
                    response_tagged.len()
                )));
            };
            context
                .set_pin_value("response", json::json!(response))
                .await?; // todo: remove prefix from response struct
            context.activate_exec_pin("exec_done").await?;
        } else {
            return Err(anyhow!("Invalid response."));
        }

        Ok(())
    }

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

        let update_tools: Vec<OpenAIFunction> = match validate_openai_functions_str(&schema_str) {
            Ok(tools) => tools,
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
