use tauri::State;

use crate::error::AppError;
use crate::state::AppState;

fn get_path(state: &AppState) -> Result<String, AppError> {
    state
        .repo_path
        .lock()
        .unwrap()
        .clone()
        .ok_or(AppError::NoRepo)
}

#[tauri::command]
pub async fn fetch_all(state: State<'_, AppState>) -> Result<String, AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || crate::git::remote::fetch_all(&path))
        .await
        .map_err(|e| AppError::Other(e.to_string()))?
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn pull_branch(state: State<'_, AppState>) -> Result<String, AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || crate::git::remote::pull(&path))
        .await
        .map_err(|e| AppError::Other(e.to_string()))?
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn push_branch(
    remote: String,
    branch: String,
    force: bool,
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || crate::git::remote::push(&path, &remote, &branch, force))
        .await
        .map_err(|e| AppError::Other(e.to_string()))?
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn push_set_upstream(
    remote: String,
    branch: String,
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || {
        crate::git::remote::push_set_upstream(&path, &remote, &branch)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}
