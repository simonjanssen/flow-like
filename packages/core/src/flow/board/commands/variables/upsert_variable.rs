use flow_like_types::{async_trait, sync::Mutex};
use schemars::JsonSchema;
use std::sync::Arc;

use crate::{
    flow::{
        board::{Board, commands::Command},
        variable::Variable,
    },
    state::FlowLikeState,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize, JsonSchema)]
pub struct UpsertVariableCommand {
    pub variable: Variable,
    pub old_variable: Option<Variable>,
}

impl UpsertVariableCommand {
    pub fn new(variable: Variable) -> Self {
        UpsertVariableCommand {
            variable,
            old_variable: None,
        }
    }
}

#[async_trait]
impl Command for UpsertVariableCommand {
    async fn execute(
        &mut self,
        board: &mut Board,
        _: Arc<Mutex<FlowLikeState>>,
    ) -> flow_like_types::Result<()> {
        if let Some(old_variable) = board
            .variables
            .insert(self.variable.id.clone(), self.variable.clone())
        {
            if !old_variable.editable {
                board
                    .variables
                    .insert(old_variable.id.clone(), old_variable);
                return Err(flow_like_types::anyhow!("Variable is not editable"));
            }

            self.old_variable = Some(old_variable);
        }
        Ok(())
    }

    async fn undo(
        &mut self,
        board: &mut Board,
        _: Arc<Mutex<FlowLikeState>>,
    ) -> flow_like_types::Result<()> {
        board.variables.remove(&self.variable.id);
        if let Some(old_variable) = self.old_variable.take() {
            board
                .variables
                .insert(old_variable.id.clone(), old_variable);
        }
        Ok(())
    }
}
