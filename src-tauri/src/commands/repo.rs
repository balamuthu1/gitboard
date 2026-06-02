use tauri::{AppHandle, State};

use crate::error::AppError;
use crate::state::AppState;
use crate::types::RepoInfo;
use crate::watcher;

#[tauri::command]
pub async fn open_repo(
    path: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<RepoInfo, AppError> {
    let path_clone = path.clone();
    let info = tokio::task::spawn_blocking(move || crate::git::repo::open_repo(&path_clone))
        .await
        .map_err(|e| AppError::Other(e.to_string()))??;

    *state.repo_path.lock().unwrap() = Some(path.clone());

    let w = watcher::start_watcher(app, &path)
        .map_err(|e| AppError::Other(e.to_string()))?;
    *state.watcher.lock().unwrap() = Some(w);

    Ok(info)
}

#[tauri::command]
pub async fn discover_repo(
    path: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<RepoInfo, AppError> {
    let path_clone = path.clone();
    let info = tokio::task::spawn_blocking(move || crate::git::repo::discover_repo(&path_clone))
        .await
        .map_err(|e| AppError::Other(e.to_string()))??;

    let repo_path = info.path.clone();
    *state.repo_path.lock().unwrap() = Some(repo_path.clone());

    let w = watcher::start_watcher(app, &repo_path)
        .map_err(|e| AppError::Other(e.to_string()))?;
    *state.watcher.lock().unwrap() = Some(w);

    Ok(info)
}

#[tauri::command]
pub async fn clone_repo(
    remote_url: String,
    local_path: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<RepoInfo, AppError> {
    let url = remote_url.clone();
    let dest = local_path.clone();
    let info = tokio::task::spawn_blocking(move || crate::git::repo::clone_repo(&url, &dest))
        .await
        .map_err(|e| AppError::Other(e.to_string()))??;

    *state.repo_path.lock().unwrap() = Some(local_path.clone());

    let w = watcher::start_watcher(app, &local_path)
        .map_err(|e| AppError::Other(e.to_string()))?;
    *state.watcher.lock().unwrap() = Some(w);

    Ok(info)
}

#[tauri::command]
pub async fn close_repo(state: State<'_, AppState>) -> Result<(), AppError> {
    *state.repo_path.lock().unwrap() = None;
    *state.watcher.lock().unwrap() = None;
    Ok(())
}
