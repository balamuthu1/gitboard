use tauri::State;

use crate::error::AppError;
use crate::state::AppState;
use crate::types::StatusEntry;

fn get_path(state: &AppState) -> Result<String, AppError> {
    state
        .repo_path
        .lock()
        .unwrap()
        .clone()
        .ok_or(AppError::NoRepo)
}

#[tauri::command]
pub async fn get_status(state: State<'_, AppState>) -> Result<Vec<StatusEntry>, AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&path)?;
        crate::git::status::get_status(&repo)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}

#[tauri::command]
pub async fn stage_path(path: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let repo_path = get_path(&state)?;
    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&repo_path)?;
        crate::git::status::stage_path(&repo, &path)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}

#[tauri::command]
pub async fn unstage_path(path: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let repo_path = get_path(&state)?;
    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&repo_path)?;
        crate::git::status::unstage_path(&repo, &path)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}

#[tauri::command]
pub async fn stage_all(state: State<'_, AppState>) -> Result<(), AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&path)?;
        crate::git::status::stage_all(&repo)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}

#[tauri::command]
pub async fn discard_changes(path: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let repo_path = get_path(&state)?;
    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&repo_path)?;
        crate::git::status::discard_changes(&repo, &path)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}
