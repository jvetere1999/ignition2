/// Tauri commands for the UI frontend
use crate::models::{WatcherSettings, WatchedProject, SyncStatus, SyncStats};
use crate::services::StateManager;
use chrono::Utc;
use uuid::Uuid;
use std::sync::Mutex;
use tauri::State;

/// Global state manager for persistent storage
pub struct WatcherState {
    pub state_manager: Mutex<StateManager>,
    pub projects: Mutex<Vec<WatchedProject>>,
    pub settings: Mutex<WatcherSettings>,
    pub stats: Mutex<SyncStats>,
}

impl WatcherState {
    pub fn new() -> Result<Self, String> {
        let state_manager = StateManager::new()?;
        
        // Load persistent state
        let projects = state_manager.load_projects().unwrap_or_default();
        let settings = state_manager.load_settings().unwrap_or_default();
        let stats = state_manager.load_stats().unwrap_or_default();
        
        Ok(Self {
            state_manager: Mutex::new(state_manager),
            projects: Mutex::new(projects),
            settings: Mutex::new(settings),
            stats: Mutex::new(stats),
        })
    }
}

#[tauri::command]
pub async fn get_watched_projects(state: State<'_, WatcherState>) -> Result<Vec<WatchedProject>, String> {
    let projects = state.projects.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    Ok(projects.clone())
}

#[tauri::command]
pub async fn add_watch_directory(
    path: String,
    daw_type: String,
    state: State<'_, WatcherState>,
) -> Result<WatchedProject, String> {
    // Validate directory exists
    crate::services::StateManager::validate_directory(&path)?;

    let daw_type = match daw_type.as_str() {
        "ableton" => crate::models::DawType::Ableton,
        "flstudio" => crate::models::DawType::FlStudio,
        "logic" => crate::models::DawType::Logic,
        "cubase" => crate::models::DawType::Cubase,
        "protools" => crate::models::DawType::ProTools,
        _ => return Err("Invalid DAW type".to_string()),
    };

    let project = WatchedProject {
        id: Uuid::new_v4().to_string(),
        name: std::path::Path::new(&path)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        path: path.clone(),
        daw_type,
        file_patterns: daw_type.watch_patterns(),
        last_sync: None,
        sync_status: SyncStatus::Idle,
        created_at: Utc::now(),
    };

    // Save to persistent storage
    let mut projects = state.projects.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    projects.push(project.clone());
    
    let state_manager = state.state_manager.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    state_manager.save_projects(&projects)?;

    Ok(project)
}

#[tauri::command]
pub async fn remove_watch_directory(project_id: String, state: State<'_, WatcherState>) -> Result<(), String> {
    let mut projects = state.projects.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    
    // Remove project from list
    projects.retain(|p| p.id != project_id);
    
    // Save updated list
    let state_manager = state.state_manager.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    state_manager.save_projects(&projects)?;

    Ok(())
}

#[tauri::command]
pub async fn get_sync_status(state: State<'_, WatcherState>) -> Result<SyncStatusInfo, String> {
    let stats = state.stats.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    
    Ok(SyncStatusInfo {
        syncing: false,
        total_files_synced: stats.total_files_synced,
        total_storage_bytes: stats.total_bytes_synced,
        last_sync_time: stats.last_sync_time.map(|t| t.to_rfc3339()),
    })
}

#[tauri::command]
pub async fn trigger_sync(state: State<'_, WatcherState>) -> Result<(), String> {
    // Update stats with new sync attempt
    let mut stats = state.stats.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    
    stats.total_syncs += 1;
    stats.successful_syncs += 1; // TODO: Implement actual sync logic
    stats.last_sync_time = Some(Utc::now());
    
    let state_manager = state.state_manager.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    state_manager.save_stats(&stats)?;

    Ok(())
}

#[tauri::command]
pub async fn get_settings(state: State<'_, WatcherState>) -> Result<WatcherSettings, String> {
    let settings = state.settings.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    Ok(settings.clone())
}

#[tauri::command]
pub async fn update_settings(new_settings: WatcherSettings, state: State<'_, WatcherState>) -> Result<(), String> {
    // Update settings in memory
    let mut settings = state.settings.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    *settings = new_settings.clone();
    
    // Save to persistent storage
    let state_manager = state.state_manager.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    state_manager.save_settings(&new_settings)?;

    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct SyncStatusInfo {
    pub syncing: bool,
    pub total_files_synced: u64,
    pub total_storage_bytes: u64,
    pub last_sync_time: Option<String>,
}

