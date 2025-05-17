use crate::{ai::ml::onnx::NodeOnnxSession, image::NodeImage};
use flow_like::{
    flow::{
        execution::{LogLevel, context::ExecutionContext},
        node::{Node, NodeLogic},
        pin::{PinOptions, ValueType},
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_types::{
    Error, JsonSchema, Result, anyhow, async_trait,
    image::{DynamicImage, imageops::FilterType},
    json::{Deserialize, Serialize, json},
};

use flow_like_model_provider::ml::{
    ndarray::{Array3, Array4, ArrayView1, Axis, s},
    ort::inputs,
};
use std::cmp::Ordering;
use std::time::Instant;

#[derive(Default)]
pub struct ImageClassificationNode {}

impl ImageClassificationNode {
    pub fn new() -> Self {
        ImageClassificationNode {}
    }
}

#[async_trait]
impl NodeLogic for ImageClassificationNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "image_classification",
            "Image Classification",
            "Image Classification with ONNX-Models",
            "AI/ML/ONNX",
        );

        node.add_icon("/flow/icons/find_model.svg");

        // inputs
        node.add_input_pin(
            "exec_in",
            "Input",
            "Initiate Execution",
            VariableType::Execution,
        );

        node.add_input_pin("model", "Model", "ONNX Model Session", VariableType::Struct)
            .set_schema::<NodeOnnxSession>()
            .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_input_pin("image_in", "Image", "Image Object", VariableType::Struct)
            .set_schema::<NodeImage>()
            .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_input_pin(
            "mean",
            "Mean",
            "Image Mean for Normalization",
            VariableType::Float,
        )
        .set_value_type(ValueType::Array);

        node.add_input_pin(
            "std",
            "Std",
            "Image Standard Deviation for Normalization",
            VariableType::Float,
        )
        .set_value_type(ValueType::Array);

        node.add_input_pin(
            "crop_pct",
            "Crop",
            "Center Crop Percentage",
            VariableType::Float,
        )
        .set_options(PinOptions::new().set_range((0., 1.)).build())
        .set_default_value(Some(json!(0.875)));

        node.add_input_pin(
            "softmax",
            "Softmax?",
            "Scale Outputs with Softmax",
            VariableType::Boolean,
        )
        .set_default_value(Some(json!(true)));

        // outputs
        node.add_output_pin(
            "exec_out",
            "Output",
            "Done with the Execution",
            VariableType::Execution,
        );

        node.add_output_pin(
            "predictions",
            "Predictions",
            "Class Predictions",
            VariableType::Struct,
        )
        .set_value_type(flow_like::flow::pin::ValueType::Array);

        node
    }

    async fn run(&self, context: &mut ExecutionContext) -> Result<()> {
        let t0 = Instant::now();
        context.deactivate_exec_pin("exec_out").await?;

        // set outputs
        context.activate_exec_pin("exec_out").await?;
        Ok(())
    }
}
