use crate::ai::ml::onnx::detect::BoundingBox;

use flow_like::{
    flow::{
        board::Board,
        execution::context::ExecutionContext,
        node::{Node, NodeLogic},
        pin::{Pin, PinOptions},
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_types::{
    anyhow, async_trait, image::{DynamicImage, Rgba}, json::json, Error
};

use std::sync::Arc;


#[derive(Default)]
pub struct MakeBoxNode {}

impl MakeBoxNode {
    pub fn new() -> Self {
        MakeBoxNode {}
    }
}

#[async_trait]
impl NodeLogic for MakeBoxNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "make_boxe", 
            "Make Box",
            "Make Bounding Box", 
            "Image/Annotate"
        );
        node.add_icon("/flow/icons/image.svg");

        // inputs
        node.add_input_pin(
            "exec_in",
            "Input",
            "Initiate Execution",
            VariableType::Execution,
        );

        node.add_input_pin(
            "definition",
            "Definition",
            "Bounding Box Definition",
            VariableType::String,
        )
            .set_options(
                PinOptions::new()
                    .set_valid_values(vec![
                        "xyxy".to_string(),
                        "x1y1wh".to_string(),
                    ])
                    .build(),
            )
            .set_default_value(Some(json!("xyxy")));

        node.add_input_pin(
            "x1",
            "x1",
            "Left",
            VariableType::Integer,
        );

        node.add_input_pin(
            "y1",
            "y1",
            "Top",
            VariableType::Integer,
        );

        node.add_input_pin(
            "x2",
            "x2",
            "Right",
            VariableType::Integer,
        );

        node.add_input_pin(
            "y2",
            "y2",
            "Bottom",
            VariableType::Integer,
        );

        // outputs
        node.add_output_pin("exec_out", "Output", "Done with the Execution", VariableType::Execution);

        node.add_output_pin("bbox", "Box", "Bounding Boxes", VariableType::Struct)
            .set_schema::<BoundingBox>();

        node
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        context.deactivate_exec_pin("exec_out").await?;

        // fetch inputs
        let definition: String = context.evaluate_pin("definition").await?;
        let bbox = match &definition {
            "xyxy" => {
                let x1 = context.evaluate_pin("x1").await?;
                let y1 = context.evaluate_pin("y1").await?;
                let x2 = context.evaluate_pin("x2").await?;
                let y2 = context.evaluate_pin("y2").await?;
                BoundingBox { x1, y1, x2, y2, score: 1.0, class_idx: 0 }
            },
            "x1y1wh" => {
                let x1 = context.evaluate_pin("x1").await?;
                let y1 = context.evaluate_pin("y1").await?;
                let w = context.evaluate_pin("w").await?;
                let h = context.evaluate_pin("h").await?;
                let x2 = x1 + w;
                let y2 = y1 + h;
                BoundingBox { x1, y1, x2, y2, score: 1.0, class_idx: 0 }
            },
            _ => Err(anyhow!("Invalid Bounding Box Definition"))
        };
        
        // set outputs
        context.set_pin_value("bbox", json!(bbox)).await?;
        context.activate_exec_pin("exec_out").await?;
        Ok(())
    }

    async fn on_update(&self, node: &mut Node, _board: Arc<Board>) {
        let definition = node
            .get_pin_by_name("definition")
            .and_then(|pin| pin.default_value.clone())
            .and_then(|bytes| flow_like_types::json::from_slice::<String>(&bytes).ok())
            .unwrap_or_default();

        let x1 = node.get_pin_by_name("x1").cloned();
        let y1 = node.get_pin_by_name("y1").cloned();
        let x2 = node.get_pin_by_name("x2").cloned();
        let y2 = node.get_pin_by_name("y2").cloned();
        let w = node.get_pin_by_name("w").cloned();
        let h = node.get_pin_by_name("h").cloned();

        match definition.as_str() {
            "x1y1wh" => {
                remove_pin(node, x2);
                remove_pin(node, y2);
                if !w.is_some() {
                    node.add_input_pin("w", "w", "Bounding Box Width", VariableType::Integer);
                }
                if !h.is_some() {
                    node.add_input_pin("h", "h", "Bounding Box Height", VariableType::Integer);
                }
            }
            _ => {
                remove_pin(node, w);
                remove_pin(node, h);
                if !x2.is_some() {
                    node.add_input_pin("x2", "x2", "Right", VariableType::Integer);
                }
                if !y2.is_some() {
                    node.add_input_pin("y2", "y2", "Bottom", VariableType::Integer);
                }
            }
        }
    }
}

fn remove_pin(node: &mut Node, pin: Option<Pin>) {
    if let Some(pin) = pin {
        node.pins.remove(&pin.id);
    }
}
