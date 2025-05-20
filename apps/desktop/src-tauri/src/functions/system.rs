use serde::{Deserialize, Serialize};

use flow_like::utils::device::{get_cores, get_ram};

#[derive(Serialize, Deserialize, Debug, Clone, Hash, PartialEq, Eq)]
pub struct SystemInfo {
    ram: u64,
    cores: u64,
}

#[tauri::command(async)]
pub fn get_system_info() -> SystemInfo {
    let ram = get_ram().unwrap_or(0);
    let cores = get_cores().unwrap_or(0);

    SystemInfo { ram, cores }
}
