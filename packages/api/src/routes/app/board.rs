pub mod delete_board;
pub mod execute_board;
pub mod execute_commands;
pub mod get_board;
pub mod get_boards;
pub mod upsert_board;
pub mod version_board;

use axum::{Router, routing::get};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/", get(get_boards::get_boards)).route(
        "/{board_id}",
        get(get_board::get_board)
            .post(execute_commands::execute_commands)
            .patch(version_board::version_board)
            .put(upsert_board::upsert_board)
            .delete(delete_board::delete_board),
    )
}
