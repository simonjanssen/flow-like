use flow_like::{
    bit::BitModelPreference,
    flow::{
        execution::context::ExecutionContext,
        node::{Node, NodeLogic},
        pin::PinOptions,
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_types::{async_trait, json::json};

#[derive(Default)]
pub struct SetWeightNode {}

impl SetWeightNode {
    pub fn new() -> Self {
        SetWeightNode {}
    }
}

#[async_trait]
impl NodeLogic for SetWeightNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "ai_generative_set_preference_weight",
            "Set Preference Weight",
            "Sets the given weight in the Model Preferences",
            "AI/Generative/Preferences",
        );
        node.add_icon("/flow/icons/struct.svg");

        node.add_input_pin(
            "exec_in",
            "Input",
            "Initiate Execution",
            VariableType::Execution,
        );

        node.add_input_pin(
            "preferences_in",
            "Preferences",
            "Current Preferences",
            VariableType::Struct,
        )
        .set_schema::<BitModelPreference>()
        .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_input_pin(
            "preferences_key",
            "Preferences",
            "The Preferences you want to set",
            VariableType::String,
        )
        .set_options(
            PinOptions::new()
                .set_valid_values(vec![
                    "Cost".to_string(),
                    "Speed".to_string(),
                    "Reasoning".to_string(),
                    "Creativity".to_string(),
                    "Factuality".to_string(),
                    "Function Calling".to_string(),
                    "Safety".to_string(),
                    "Openness".to_string(),
                    "Multilinguality".to_string(),
                    "Coding".to_string(),
                ])
                .build(),
        )
        .set_default_value(Some(json!("Cost")));

        node.add_input_pin("weight", "Weight", "Weight to set", VariableType::Float)
            .set_options(PinOptions::new().set_range((0.0, 1.0)).build());

        node.add_output_pin(
            "exec_out",
            "Output",
            "Done with the Execution",
            VariableType::Execution,
        );

        node.add_output_pin(
            "preferences_out",
            "Preferences",
            "Updated Preferences",
            VariableType::Struct,
        )
        .set_schema::<BitModelPreference>();

        return node;
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        context.deactivate_exec_pin("exec_out").await?;

        let mut preferences: BitModelPreference = context.evaluate_pin("preferences_in").await?;
        let preferences_key: String = context.evaluate_pin("preferences_key").await?;
        let weight: f32 = context.evaluate_pin("weight").await?;

        match preferences_key.as_str() {
            "Cost" => preferences.cost_weight = Some(weight),
            "Speed" => preferences.speed_weight = Some(weight),
            "Reasoning" => preferences.reasoning_weight = Some(weight),
            "Creativity" => preferences.creativity_weight = Some(weight),
            "Factuality" => preferences.factuality_weight = Some(weight),
            "Function Calling" => preferences.function_calling_weight = Some(weight),
            "Safety" => preferences.safety_weight = Some(weight),
            "Openness" => preferences.openness_weight = Some(weight),
            "Multilinguality" => preferences.multilinguality_weight = Some(weight),
            "Coding" => preferences.coding_weight = Some(weight),
            _ => {}
        }

        context
            .set_pin_value("preferences_out", json!(preferences))
            .await?;
        context.activate_exec_pin("exec_out").await?;

        Ok(())
    }
}
