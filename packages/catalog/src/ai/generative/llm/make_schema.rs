/// # Invoke LLMs to generate a Function Call Definition
/// Function call definitions or JSON Schemas are tidious to write by hand so this is an utility node to help you out.
/// Output is guaranteed to be a valid OpenAI-like Function Call Definition
use crate::utils::json::parse_with_schema::validate_openai_function;
use flow_like::{
    bit::Bit,
    flow::{
        execution::{
            LogLevel,
            context::ExecutionContext,
        },
        node::{Node, NodeLogic},
        pin::PinOptions,
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_model_provider::history::{History, HistoryMessage, Role};
use flow_like_types::{anyhow, async_trait};

const SYSTEM_PROMPT: &str = r#"
# Instructions

You are a function call schema generator.

Given the user's input, infer a matching json schema. 

# Example
user: 
call a weather api, with location arg for city or country and units temperature

output:
[SCHEMA]{
  "type": "function",
  "name": "get_weather",
  "description": "Retrieves current weather for the given location.",
  "parameters": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City and country e.g. Bogotá, Colombia"
      },
      "units": {
        "type": "string",
        "enum": [
          "celsius",
          "fahrenheit"
        ],
        "description": "Units the temperature will be returned in."
      }
    },
    "required": [
      "location",
      "units"
    ],
    "additionalProperties": false
  },
  "strict": true
}

# Output Format
You have only one option to answer:
- Generate a schema: [SCHEMA]{"type": "function", "name": ..., "description": ..., "parameters": ..., "strict": true }
"#;

#[derive(Default)]
pub struct LLMMakeSchema {}

impl LLMMakeSchema {
    pub fn new() -> Self {
        LLMMakeSchema {}
    }
}

#[async_trait]
impl NodeLogic for LLMMakeSchema {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "llm_make_schema",
            "Make Function Schema",
            "Generate Function Definition for Tool Calls",
            "AI/Generative",
        );
        node.add_icon("/flow/icons/bot-invoke.svg");

        node.add_input_pin("exec_in", "Input", "Trigger Pin", VariableType::Execution);

        node.add_input_pin("model", "Model", "Model", VariableType::Struct)
            .set_schema::<Bit>()
            .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_input_pin(
            "prompt",
            "Prompt",
            "Input message with hints how to generate the schema.",
            VariableType::String,
        );

        node.add_output_pin(
            "exec_out",
            "Execution Output",
            "Execution Output",
            VariableType::Execution,
        );

        node.add_output_pin(
            "function",
            "Function",
            "Generated Function Call Schema",
            VariableType::Struct,
        );

        node.set_long_running(true);

        return node;
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        // fetch inputs
        context.deactivate_exec_pin("exec_out").await?;
        let model = context.evaluate_pin::<Bit>("model").await?;
        let prompt: String = context.evaluate_pin("prompt").await?;

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
        history.set_system_prompt(SYSTEM_PROMPT.to_string());
        history.push_message(HistoryMessage::from_string(Role::User, &prompt));

        // generate response
        let response = model.invoke(&history, None).await?;
        let mut response_string = "".to_string();
        if let Some(response) = response.last_message() {
            response_string = response.content.clone().unwrap_or("".to_string());
        }
        context.log_message(&response_string, LogLevel::Debug);

        // parse + validate function defintion
        let substrings: Vec<String> = response_string
            .split("[SCHEMA]")
            .map(|s| s.to_string())
            .collect();
        let definition_str = match substrings.last() {
            Some(value) => value,
            _ => return Err(anyhow!("Failed to parse function definition from response")),
        };
        let defintion = validate_openai_function(definition_str)?;

        // set outputs
        context.set_pin_value("function", defintion).await?;
        context.activate_exec_pin("exec_out").await?;
        Ok(())
    }
}
