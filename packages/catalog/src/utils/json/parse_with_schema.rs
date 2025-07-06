use std::fmt::format;

use flow_like::{
    flow::{
        execution::{LogLevel, context::ExecutionContext},
        node::{Node, NodeLogic},
        variable::VariableType,
    },
    state::FlowLikeState,
    utils::json::parse_malformed_json,
};
use flow_like_types::{Error, Value, anyhow, async_trait, json, jsonschema};

/// Is this JSON Value an OpenAI Function Definition?
/// https://platform.openai.com/docs/guides/function-calling?api-mode=responses#defining-functions
pub fn is_openai(data: &Value) -> bool {
    let map = match data.as_object() {
        Some(m) => m,
        None => return false,
    };

    // check "type" is "function"
    if map.get("type") != Some(&Value::String("function".into())) {
        return false;
    }

    // check required fields
    for key in ["name", "description", "parameters", "strict"] {
        if map.get(key).map_or(true, Value::is_null) {
            return false;
        }
    }
    true
}

/// Validates JSON against OpenAI Function Definition Schema
/// https://platform.openai.com/docs/guides/function-calling?api-mode=responses#defining-functions
/// Returns parsed JSON Value if valid
pub fn validate_openai_function(definition_str: &str) -> Result<Value, Error> {
    // Is definition input pin value valid JSON?
    let definition: Value = match json::from_str(&definition_str) {
        Ok(definition) => definition,
        Err(e) => {
            return Err(anyhow!(format!(
                "Failed to load definition/schema from input string: {}",
                e
            )));
        }
    };

    let map = match definition.as_object() {
        Some(m) => m,
        None => return Err(anyhow!("Invalid JSON definition")),
    };

    // "type" should always be function
    if map.get("type") != Some(&Value::String("function".into())) {
        return Err(anyhow!("As of now, 'type' should always be 'function'"));
    }

    // check required keys
    for key in ["name", "description", "strict"] {
        if map.get(key).map_or(true, Value::is_null) {
            return Err(anyhow!(format!("Missing required key {}", key)));
        }
    }

    // check whether 'parameters' is valid JSON schema
    match map.get("parameters") {
        Some(parameters) => {
            if !jsonschema::meta::is_valid(parameters) {
                return Err(anyhow!(
                    "'parameters' value is not a valid JSON schema definition"
                ));
            }
        }
        None => return Err(anyhow!("Missing required key: parameters")),
    };

    // todo: add strict option to ensure all properties in parameters have descriptions

    Ok(definition)
}

/// Converts OpenAI Function Defintion to JSON Schema
/// Returns data as-is if not OpenAI
pub fn into_json_schema(data: Value) -> Result<Value, Error> {
    if is_openai(&data) {
        if let Some(obj) = data.as_object() {
            if let Some(parameters) = obj.get("parameters") {
                if let Some(mut parameters_obj) = parameters.as_object().cloned() {
                    parameters_obj.remove("additionalProperties");
                    let name = match obj.get("name").cloned() {
                        Some(name) => name,
                        None => Value::Null,
                    };
                    parameters_obj.insert("title".to_string(), name);
                    return Ok(Value::Object(parameters_obj));
                }
            }
        }
        return Err(anyhow!("Failed to convert OpenAI function to JSON Schema"));
    } else {
        Ok(data)
    }
}

/// Creates a JSON Schema Validator for a JSON Schema or OpenAI Function Definition
fn get_schema_validator(definition_str: &str) -> Result<jsonschema::Validator, Error> {
    // Is definition input pin value valid JSON?
    let definition: Value = match json::from_str(&definition_str) {
        Ok(definition) => definition,
        Err(e) => {
            return Err(anyhow!(format!(
                "Failed to load definition/schema from input string: {}",
                e
            )));
        }
    };

    // Convert defintion into JSON Schema spec
    let schema = into_json_schema(definition)?;

    // Create Schema Validator
    let validator = match jsonschema::validator_for(&schema) {
        Ok(validator) => validator,
        Err(e) => return Err(anyhow!(format!("Failed to load schema validator: {}", e))),
    };
    Ok(validator)
}

/// Validates JSON data against JSON/OpenAI Schema and returns JSON data as Value
/// Returns a JSON Value that is compliant with the given definition
pub fn validate_json_data(definition_str: &str, data_str: &str) -> Result<Value, Error> {
    // Get schema validator
    let validator = get_schema_validator(definition_str)?;

    // Is data input pin value valid JSON?
    let data: Value = match json::from_str(data_str) {
        Ok(data) => data,
        Err(e) => return Err(anyhow!(format!("Failed to parse JSON data: {}", e))),
    };

    // Validate input data againts JSON schema
    let errors = validator.iter_errors(&data);
    let error_msg = errors
        .map(|e| format!("Error: {}, Location: {}", e, e.instance_path))
        .collect::<Vec<_>>()
        .join("\n");

    if error_msg.len() < 1 {
        return Ok(data);
    } else {
        return Err(anyhow!(format!("Schema validation failed: {}", error_msg)));
    }
}

// todo: multiple defintions + tool_call name
pub fn validate_openai_tool_call(
    definition_str: &str,
    tool_call_str: &str,
) -> Result<Value, Error> {
    // Get schema validator
    let validator = get_schema_validator(definition_str)?;

    // Is data input pin value valid JSON?
    let tool_call: Value = match json::from_str(tool_call_str) {
        Ok(data) => data,
        Err(e) => return Err(anyhow!(format!("Failed to parse JSON data: {}", e))),
    };

    let data = match tool_call.as_object() {
        Some(data) => match data.get("args") {
            Some(data) => data,
            None => return Err(anyhow!("Missing tool call args")),
        },
        None => return Err(anyhow!("Invalid tool call")),
    };

    // Validate input data againts JSON schema
    let errors = validator.iter_errors(&data);
    let error_msg = errors
        .map(|e| format!("Error: {}, Location: {}", e, e.instance_path))
        .collect::<Vec<_>>()
        .join("\n");

    if error_msg.len() < 1 {
        return Ok(data.clone());
    } else {
        return Err(anyhow!(format!("Schema validation failed: {}", error_msg)));
    }
}

#[derive(Default)]
pub struct ParseWithSchema {}

impl ParseWithSchema {
    pub fn new() -> Self {
        ParseWithSchema {}
    }
}

#[async_trait]
impl NodeLogic for ParseWithSchema {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "parse_with_schema",
            "Parse JSON with Schema",
            "Parse JSON input Data With JSON/OpenAI Schema and Return Value",
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
            "Schema",
            "JSON Schema or OpenAI Function Definition",
            VariableType::String,
        );

        node.add_input_pin(
            "data",
            "Data",
            "JSON Input Data to be parsed",
            VariableType::String,
        );

        node.add_output_pin(
            "exec_out",
            "Output",
            "Execution continues if parsing succeeds",
            VariableType::Execution,
        );

        node.add_output_pin(
            "parsed",
            "Parsed",
            "Parsed and Validated JSON",
            VariableType::Struct,
        );

        return node;
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        context.deactivate_exec_pin("exec_out").await?;
        let definition_str: String = context.evaluate_pin("schema").await?;
        let data_str: String = context.evaluate_pin("data").await?;

        let validated = validate_json_data(&definition_str, &data_str)?;

        context.set_pin_value("parsed", validated).await?;
        context.activate_exec_pin("exec_out").await?;
        Ok(())
    }
}
