/// # ONNX Object Detection Nodes

use crate::{
    ai::ml::onnx::NodeOnnxSession, 
    image::NodeImage,
};
use flow_like::{
    flow::{
        execution::{LogLevel, context::ExecutionContext},
        node::{Node, NodeLogic},
        pin::PinOptions,
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_types::{
    anyhow, async_trait, image::{imageops::FilterType, DynamicImage}, Error, Result, json::{json, Serialize, Deserialize},
    JsonSchema,
};

use flow_like_model_provider::ml::{
    ort::inputs,
    ndarray::{Array3, Array4, Axis, ArrayView1, s}
};
use std::cmp::Ordering;
use std::time::Instant;

/// # Load DynamicImage as Array4
/// Resulting normalized 4-dim array has shape [B, C, W, H] (batch size, channels, width, height)
/// ONNX detection model requires Array4-shaped, 0..1 normalized input
fn img_to_arr(img: &DynamicImage) -> Result<Array4<f32>, Error> {
    let (width, height) = (640, 640);
    let buf_u8 = img
        .resize_exact(width, height, FilterType::Triangle)
        .to_rgb8()
        .into_raw();

    let buf_f32: Vec<f32> = buf_u8
        .into_iter()
        .map(|v| (v as f32) / 255.0)
        .collect();

    let arr4 = Array3::from_shape_vec((height as usize, width as usize, 3), buf_f32)?
        .permuted_axes([2, 0, 1])
        .insert_axis(Axis(0));

    Ok(arr4)
}

/// Convert center-x, center-y, width, height to left, top, right, bottom representation
fn xywh_to_xyxy(x: &f32, y: &f32, w: &f32, h: &f32) -> (f32, f32, f32, f32) {
    let x1 = x - w / 2.0;
    let y1 = y - h / 2.0;
    let x2 = x + w / 2.0;
    let y2 = y + h / 2.0;
    (x1, y1, x2, y2)
}

/// # Bounding Box
/// Represents an object within an image by its enclosing 2D-box.
#[derive(Default, Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct BoundingBox {
    pub x1: f32, // left
    pub y1: f32, // top 
    pub x2: f32, // right
    pub y2: f32, // bottom
    pub score: f32,
    pub class_idx: i32,
}

impl BoundingBox {
    /// center-x, center-y, width, height
    pub fn xywh(&self) -> (u32, u32, u32, u32) {
        let w = self.x2 - self.x1;
        let h = self.y2 - self.y1;
        let x = (self.x2 + self.x1) / 2.0;
        let y = (self.y2 + self.y1) / 2.0;
        (x as u32, y as u32, w as u32, h as u32)
    }

    /// left, top, width, height
    pub fn x1y1wh(&self) -> (u32, u32, u32, u32) {
        let w = self.x2 - self.x1;
        let h = self.y2 - self.y1;
        (self.x1 as u32, self.y1 as u32, w as u32, h as u32)
    }

    pub fn area(&self) -> f32 {
        let w = self.x2 - self.x1;
        let h = self.y2 - self.y1;
        if w > 0.0 && h > 0.0 {
            w * h
        } else {
            0.0
        }
    }

    pub fn iou(&self, other: &BoundingBox) -> f32 {
        let x1_inter = self.x1.max(other.x1);
        let y1_inter = self.y1.max(other.y1);
        let x2_inter = self.x2.min(other.x2);
        let y2_inter = self.y2.min(other.y2);

        let w_inter = x2_inter - x1_inter;
        let h_inter = y2_inter - y1_inter;

        let intersection = if w_inter > 0.0 && h_inter > 0.0 {
            w_inter * h_inter
        } else {
            0.0
        };

        let union = self.area() + other.area() - intersection;

        if union > 0.0 {
            intersection / union
        } else {
            0.0
        }
    }

    pub fn from_array(arr: ArrayView1<f32>) -> Self {
        let bbox_xywh = arr.slice(s![..4]).to_vec();
        let confs = arr.slice(s![4..]).to_vec();
        let (class_idx, conf) = confs
            .iter()
            .enumerate()
            .filter_map(|(idx, &num)| {
                if num.is_nan() {
                    None
                } else {
                    Some((idx, num))
                }
            })
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(Ordering::Equal))
            .unwrap();
        let (x1, y1, x2, y2) = xywh_to_xyxy(&bbox_xywh[0], &bbox_xywh[1], &bbox_xywh[2], &bbox_xywh[3]);
        Self { x1, y1, x2, y2, score: conf, class_idx: class_idx as i32 }
    }

    pub fn scale(&mut self, scale_w: f32, scale_h: f32) {
        self.x1 *= scale_w;
        self.y1 *= scale_h;
        self.x2 *= scale_w;
        self.y2 *= scale_h;
    }

}


/// Class-Sensitive Non Maxima Suppression for Overlapping Bounding Boxes
/// Iteratively removes lower scoring bboxes which have an IoU above iou_thresold.
/// Inspired by: https://pytorch.org/vision/master/_modules/torchvision/ops/boxes.html#nms 
fn nms(boxes: &[BoundingBox], iou_threshold: f32) -> Vec<BoundingBox> {
    if boxes.is_empty() {
        return Vec::new();
    }

    // Compute the maximum coordinate value among all boxes
    let max_coordinate = boxes.iter().fold(0.0_f32, |max_coord, bbox| {
        max_coord.max(bbox.x2).max(bbox.y2)
    });
    let offset = max_coordinate + 1.0;

    // Create a vector of shifted boxes with their original indices
    let mut boxes_shifted: Vec<(BoundingBox, usize)> = boxes
        .iter()
        .enumerate()
        .map(|(i, bbox)| {
            let class_offset = offset * bbox.class_idx as f32;
            let shifted_bbox = BoundingBox {
                x1: bbox.x1 + class_offset,
                y1: bbox.y1 + class_offset,
                x2: bbox.x2 + class_offset,
                y2: bbox.y2 + class_offset,
                score: bbox.score,
                class_idx: bbox.class_idx, // Keep class_idx the same
            };
            (shifted_bbox, i) // Keep track of the original index
        })
        .collect();

    // Sort boxes in decreasing order based on scores
    boxes_shifted.sort_unstable_by(|a, b| {
        b.0.score
            .partial_cmp(&a.0.score)
            .unwrap_or(Ordering::Equal)
    });

    let mut keep_indices = Vec::new();

    while let Some((current_box, original_index)) = boxes_shifted.first().cloned() {
        keep_indices.push(original_index);
        boxes_shifted.remove(0);

        // Retain boxes that have an IoU less than or equal to the threshold with the current box
        boxes_shifted.retain(|(bbox, _)| current_box.iou(bbox) <= iou_threshold);
    }

    // Collect the kept boxes from the original input
    let mut kept_boxes: Vec<BoundingBox> = keep_indices
        .into_iter()
        .map(|idx| boxes[idx].clone())
        .collect();

    // Sort the kept boxes in decreasing order of their scores
    kept_boxes.sort_unstable_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(Ordering::Equal)
    });

    kept_boxes

}


#[derive(Default)]
/// # Object Detection Node
/// Evaluate ONNX-based Object Detection Models for Images
pub struct ObjectDetectionNode {}

impl ObjectDetectionNode {
    /// Create new LoadOnnxNode Instance
    pub fn new() -> Self {
        ObjectDetectionNode {  }
    }
}

#[async_trait]
impl NodeLogic for ObjectDetectionNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "object_detection",
            "Object Detection",
            "Object Detection in Images with ONNX-Models",
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

        node.add_input_pin(
            "model", 
            "Model", 
            "ONNX Model Session", 
            VariableType::Struct
        )
            .set_schema::<NodeOnnxSession>()
            .set_options(PinOptions::new()
                .set_enforce_schema(true)
                .build()
            );

        node.add_input_pin(
            "image_in", 
            "Image", 
            "Image Object", 
            VariableType::Struct
        )
            .set_schema::<NodeImage>()
            .set_options(PinOptions::new()
                .set_enforce_schema(true)
                .build()
            );

        node.add_input_pin(
            "conf", 
            "Conf", 
            "Confidence Threshold", 
            VariableType::Float
        )
            .set_options(PinOptions::new().set_range((0., 1.)).build())
            .set_default_value(Some(json!(0.25)));

        node.add_input_pin(
            "iou", 
            "IoU", 
            "Intersection Over Union Threshold for NMS", 
            VariableType::Float
        )
            .set_options(PinOptions::new().set_range((0., 1.)).build())
            .set_default_value(Some(json!(0.7)));

        node.add_input_pin(
            "max", 
            "Max", 
            "Maximum Number of Detections", 
            VariableType::Integer
        )
            .set_options(PinOptions::new().set_range((0., 1000.)).build())
            .set_default_value(Some(json!(300)));
        
        // outputs 
        node.add_output_pin(
            "exec_out",
            "Output",
            "Done with the Execution",
            VariableType::Execution,
        );

        node.add_output_pin(
            "bboxes",
            "Boxes",
            "Bounding Box Predictions",
            VariableType::Struct,
        )
            .set_schema::<BoundingBox>()
            .set_value_type(flow_like::flow::pin::ValueType::Array);

        node

    }

    async fn run(&self, context: &mut ExecutionContext) -> Result<()> {

        let t0 = Instant::now();
        context.deactivate_exec_pin("exec_out").await?;

        // fetch params
        let conf_thres: f32 = context.evaluate_pin("conf").await?;
        let iou_thres: f32 = context.evaluate_pin("iou").await?;
        let max_detect: u32 = context.evaluate_pin("max").await?;
        
        // fetch cached 
        let node_img: NodeImage = context.evaluate_pin("image_in").await?;
        let img = node_img.get_image(context).await?;
        
        let node_session: NodeOnnxSession = context.evaluate_pin("model").await?;
        let session = node_session.get_session(context).await?;
        let dt = t0.elapsed();
        context.log_message(&format!("[init node]: {:?}", dt), LogLevel::Debug);
        
        // prepare ONNX-model input
        let t0 = Instant::now();
        let (arr, target_width, target_height) = {
            let img_guard = img.lock().await;
            let (width, height) = (img_guard.width() as f32, img_guard.height() as f32);
            let arr = img_to_arr(&img_guard)?;
            (arr, width, height)
        };
        
        // run inference
        let candidates_image = {
            let session_guard = session.lock().await;

            // dynamically fetch input/output array names from onnx session
            let input_name = match session_guard.inputs.get(0) {
                Some(input_name) => &input_name.name,
                _ => "images"
            };
            let output_name = match session_guard.outputs.get(0) {
                Some(output_name) => &output_name.name,
                _ => "output0"
            };

            context.log_message(&format!("input array: {:?}", arr.shape()), LogLevel::Debug);
            let inputs = match inputs![input_name => arr.view()] {
                Ok(mapping) => Ok(mapping),
                Err(_) => Err(anyhow!("failed to prepare onnx model input")),
            }?;
            let dt = t0.elapsed();
            context.log_message(&format!("[preprocessing]: {:?}", dt), LogLevel::Debug);

            let t0 = Instant::now();
            let outputs = session_guard.run(inputs)?;
            let arr_out = outputs[output_name].try_extract_tensor::<f32>()?;
            context.log_message(&format!("output array: {:?}", arr_out.shape()), LogLevel::Debug);
            let dt = t0.elapsed();
            context.log_message(&format!("[inference]: {:?}", dt), LogLevel::Debug);
        
            // postprocessing
            let t0 = Instant::now();
            let view_candidates = arr_out.slice(s![0, 4.., ..]);
            context.log_message(&format!("view candidates: {:?}", arr_out.shape()), LogLevel::Debug);

            // determine candidates for which the max over all class conf is > conf_thres
            let mask_candidates: Vec<bool> = view_candidates
                .axis_iter(Axis(1))
                .map(|col| col.iter().cloned().fold(f32::NEG_INFINITY, f32::max) > conf_thres)
                .collect();
            context.log_message(&format!("mask_candidates: {:?}", mask_candidates.len()), LogLevel::Debug);

            // get candidate rows
            let idx_candidates: Vec<usize> = mask_candidates.iter()
                .enumerate()
                .filter_map(|(i, &keep)| if keep { Some(i) } else { None } )
                .collect();
            context.log_message(&format!("idx_candidates: {:?}", idx_candidates.len()), LogLevel::Debug);
            
            // select candidates = all detections with at least one class conf > conf_thres
            let candidates_image = arr_out.select(Axis(2), &idx_candidates).squeeze();  // todo: handle batch processing
            context.log_message(&format!("candidates_image: {:?}", candidates_image.shape()), LogLevel::Debug);
            candidates_image
        };

        // extract bboxes from output vectors
        let mut bboxes: Vec<BoundingBox> = Vec::with_capacity(candidates_image.len_of(Axis(1)));
        for (_, candidate) in candidates_image.axis_iter(Axis(1)).enumerate() {
            //println!("\tshape for candidate {:?}: {:?}", idx_candidate, candidate.shape());
            let bbox = BoundingBox::from_array(candidate.to_shape(candidate.len(),).unwrap().view());
            bboxes.push(bbox);
        }
        context.log_message(&format!("len bboxes: {:?}", bboxes.len()), LogLevel::Debug);

        // apply nms
        let mut bboxes = nms(&bboxes, iou_thres);
        bboxes.truncate(max_detect as usize); // keep only max detections
        context.log_message(&format!("len bboxes nms: {:?}", bboxes.len()), LogLevel::Debug);

        // scale boxes to original input image dims
        let (base_w, base_h) = (640., 640.);
        let scale_w = target_width / base_w;
        let scale_h = target_height / base_h;
        for bbox in &mut bboxes {
            bbox.scale(scale_w, scale_h);
        }

        let dt = t0.elapsed();
        context.log_message(&format!("[postprocessing]: {:?}", dt), LogLevel::Debug);

        // set outputs
        context.set_pin_value("bboxes", json!(bboxes)).await?;
        context.activate_exec_pin("exec_out").await?;
        Ok(())

    }
}