/// # Invoke LLM with Structured Output
/// Let LLMs reply with Structs to your Inputs. Effectively, this is a forced single-tool call configuration.
/// Output is guranteed to follow the specified schema or definion
use crate::utils::json::parse_with_schema::validate_openai_tool_call;
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
    history::{History, HistoryMessage, Role},
    llm::LLMCallback,
    response_chunk::ResponseChunk,
};
use flow_like_types::{Value, anyhow, async_trait, json};

const SYSTEM_PROMPT_TEMPLATE: &str = r#"
# Instruction
You are a binary decision maker. Rate the user's input whether it evaluates to true/yes or false/no.

# Tools
Here is the tool, you **must** use to make your response:

```json
DEFINITION_STR
```

# Input Messages
Previous tool outputs are indicated with a [TOOLOUTPUT] prefix.

# Output Format
You have only one option to answer:
- Use a tool: [TOOLUSE]{"name": "name of the tool", "args": ...}
"#;

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

        node.add_input_pin(
            "schema",
            "Schema",
            "JSON Schema or OpenAI Function Definition",
            VariableType::String,
        );

        node.add_input_pin(
            "prompt",
            "Prompt",
            "Input message that can be answered with either yes or no.",
            VariableType::String,
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

        node.set_long_running(true);

        return node;
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        // fetch inputs
        context.deactivate_exec_pin("exec_out").await?;
        let model = context.evaluate_pin::<Bit>("model").await?;
        let definition_str: String = context.evaluate_pin("schema").await?; // todo: at some point this will be a struct
        let prompt = context.evaluate_pin::<String>("prompt").await?;

        // load model
        let mut model_name = model.id.clone();
        if let Some(meta) = model.meta.get("en") {
            model_name = meta.name.clone();
        }
        let model_factory = context.app_state.lock().await.model_factory.clone();
        let model = model_factory
            .lock()
            .await
            .build(&model, context.app_state.clone())
            .await?;
        let mut history = History::new(model_name.clone(), vec![]);

        // construct system prompt + history
        let system_prompt = SYSTEM_PROMPT_TEMPLATE.replace("DEFINITION_STR", &definition_str);
        history.set_system_prompt(system_prompt.to_string());
        history.push_message(HistoryMessage::from_string(Role::User, &prompt));

        // generate response
        let response = model.invoke(&history, None).await?;
        let mut response_string = "".to_string();
        if let Some(response) = response.last_message() {
            response_string = response.content.clone().unwrap_or("".to_string());
        }
        context.log_message(&response_string, LogLevel::Debug);

        // parse tool call
        let substrings: Vec<String> = response_string
            .split("[TOOLUSE]")
            .map(|s| s.to_string())
            .collect();
        let tool_call_str = match substrings.last() {
            Some(value) => value,
            _ => return Err(anyhow!("Failed to parse tool call from response")),
        };
        let tool_call = validate_openai_tool_call(&definition_str, &tool_call_str)?;

        // set outputs
        context.set_pin_value("response", tool_call).await?;
        context.activate_exec_pin("exec_out").await?;
        Ok(())
    }
}
