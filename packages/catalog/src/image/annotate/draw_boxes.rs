use crate::{ai::ml::onnx::detect::BoundingBox, image::NodeImage};

use flow_like::{
    flow::{
        execution::context::ExecutionContext,
        node::{Node, NodeLogic},
        pin::PinOptions,
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_types::{
    Error, async_trait,
    image::{DynamicImage, Rgba},
    imageproc::{drawing::draw_hollow_rect_mut, rect::Rect},
    json::json,
};

/// Pastelle Colors for Bounding Boxes
const COLORS: [Rgba<u8>; 10] = [
    Rgba([255, 153, 170, 255]), // More intense Pink
    Rgba([255, 204, 153, 255]), // More intense Peach
    Rgba([255, 255, 153, 255]), // More intense Yellow
    Rgba([153, 255, 178, 255]), // More intense Mint Green
    Rgba([153, 204, 255, 255]), // More intense Blue
    Rgba([204, 153, 255, 255]), // More intense Lavender
    Rgba([255, 153, 204, 255]), // More intense Rose
    Rgba([204, 255, 153, 255]), // More intense Lime
    Rgba([255, 153, 255, 255]), // More intense Magenta
    Rgba([153, 255, 255, 255]), // More intense Cyan
];

/// # Draw Rectangles
/// Draws hollow rectangles onto input image using BoundingBox coordinates
/// Applies box thickness that is dynamically scaled by input image resolution
fn draw_bboxes(mut img: DynamicImage, bboxes: &Vec<BoundingBox>) -> Result<DynamicImage, Error> {
    let img_d = img.width().min(img.height());
    let thickness = 15.0 / 3726. * (img_d as f64); // scale thickness by smaller image edge
    let thickness = (thickness as u32).max(1);
    for bbox in bboxes.iter() {
        let box_color = COLORS[(bbox.class_idx as usize) % COLORS.len()];
        let (x1, y1, w, h) = bbox.x1y1wh();
        for t in 0..thickness {
            let x = x1 - t;
            let y = y1 - t;
            let w = w + 2 * t;
            let h = h + 2 * t;
            let rect = Rect::at(x as i32, y as i32).of_size(w, h);
            draw_hollow_rect_mut(&mut img, rect, box_color);
        }
    }
    Ok(img)
}

#[derive(Default)]
pub struct DrawBoxesNode {}

impl DrawBoxesNode {
    pub fn new() -> Self {
        DrawBoxesNode {}
    }
}

#[async_trait]
impl NodeLogic for DrawBoxesNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "draw_boxes",
            "Draw Boxes",
            "Draw Bounding Boxes",
            "Image/Annotate",
        );
        node.add_icon("/flow/icons/image.svg");

        // inputs
        node.add_input_pin(
            "exec_in",
            "Input",
            "Initiate Execution",
            VariableType::Execution,
        );
        node.add_input_pin("image_in", "Image", "Image object", VariableType::Struct)
            .set_schema::<NodeImage>()
            .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_input_pin("bboxes", "Boxes", "Bounding Boxes", VariableType::Struct)
            .set_schema::<BoundingBox>()
            .set_value_type(flow_like::flow::pin::ValueType::Array)
            .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_input_pin(
            "use_ref",
            "Use Reference",
            "Use Reference of the image, transforming the original instead of a copy",
            VariableType::Boolean,
        )
        .set_default_value(Some(json!(false))); // default false since we typically want to re-use the source image without painted boxes

        // outputs
        node.add_output_pin(
            "exec_out",
            "Output",
            "Done with the Execution",
            VariableType::Execution,
        );

        node.add_output_pin(
            "image_out",
            "Image",
            "Image with Bounding Boxes",
            VariableType::Struct,
        )
        .set_schema::<NodeImage>();

        node
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        context.deactivate_exec_pin("exec_out").await?;

        // fetch inputs
        let mut node_img: NodeImage = context.evaluate_pin("image_in").await?;
        let use_ref: bool = context.evaluate_pin("use_ref").await?;
        let bboxes: Vec<BoundingBox> = context.evaluate_pin("bboxes").await?;
        if !use_ref {
            node_img = node_img.copy_image(context).await?;
        }
        let img = node_img.get_image(context).await?;

        // annotate image
        {
            let mut img_guard = img.lock().await;
            let img_annotated = draw_bboxes(img_guard.clone(), &bboxes)?;
            *img_guard = img_annotated;
        }

        // set outputs
        context.set_pin_value("image_out", json!(node_img)).await?;
        context.activate_exec_pin("exec_out").await?;
        Ok(())
    }
}
