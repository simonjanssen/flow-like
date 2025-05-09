use flow_like_types::{async_trait, create_id, sync::Mutex};
use schemars::JsonSchema;
use std::sync::Arc;

use crate::{
    flow::{
        board::{Board, commands::Command},
        pin::Pin,
    },
    state::FlowLikeState,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize, JsonSchema)]
pub struct UpsertPinCommand {
    pub node_id: String,
    pub pin: Pin,
    pub old_pin: Option<Pin>,
}

impl UpsertPinCommand {
    pub fn new(node_id: String, pin: Pin) -> Self {
        UpsertPinCommand {
            node_id,
            pin,
            old_pin: None,
        }
    }
}

#[async_trait]
impl Command for UpsertPinCommand {
    async fn execute(
        &mut self,
        board: &mut Board,
        _: Arc<Mutex<FlowLikeState>>,
    ) -> flow_like_types::Result<()> {
        let node = match board.nodes.get_mut(&self.node_id) {
            Some(node) => node,
            None => return Err(flow_like_types::anyhow!("Node not found".to_string())),
        };

        if node.pins.contains_key(&self.pin.id) {
            self.old_pin = node.pins.insert(self.pin.id.clone(), self.pin.clone());
            board.fix_pins_set_layer();
            return Ok(());
        }

        let mut pin = self.pin.clone();
        pin.id = create_id();

        let num_pins = node
            .pins
            .iter()
            .filter(|(_, v)| v.pin_type == pin.pin_type)
            .count();

        pin.index = num_pins as u16 + 1;

        node.pins.insert(pin.id.clone(), pin.clone());
        self.pin = pin;

        board.fix_pins_set_layer();

        Ok(())
    }

    async fn undo(
        &mut self,
        board: &mut Board,
        _: Arc<Mutex<FlowLikeState>>,
    ) -> flow_like_types::Result<()> {
        let node = match board.nodes.get_mut(&self.node_id) {
            Some(node) => node,
            None => return Err(flow_like_types::anyhow!("Node not found".to_string())),
        };

        if let Some(old_pin) = self.old_pin.take() {
            node.pins.insert(old_pin.id.clone(), old_pin);
        } else {
            node.pins.remove(&self.pin.id);
        }

        board.fix_pins_set_layer();

        Ok(())
    }
}
