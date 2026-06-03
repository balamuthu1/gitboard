use tauri::State;

use crate::error::AppError;
use crate::state::AppState;
use crate::types::BranchInfo;

fn get_path(state: &AppState) -> Result<String, AppError> {
    state
        .repo_path
        .lock()
        .unwrap()
        .clone()
        .ok_or(AppError::NoRepo)
}

#[tauri::command]
pub async fn list_branches(state: State<'_, AppState>) -> Result<Vec<BranchInfo>, AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&path)?;
        crate::git::branches::list_branches(&repo)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}

#[tauri::command]
pub async fn checkout_branch(name: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&path)?;
        crate::git::branches::checkout_branch(&repo, &name)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}

#[tauri::command]
pub async fn checkout_commit(oid: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&path)?;
        crate::git::branches::checkout_commit(&repo, &oid)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}

#[tauri::command]
pub async fn create_branch(
    name: String,
    from: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&path)?;
        crate::git::branches::create_branch(&repo, &name, from.as_deref())
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}

#[tauri::command]
pub async fn delete_branch(name: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&path)?;
        crate::git::branches::delete_branch(&repo, &name)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}

#[tauri::command]
pub async fn merge_branch(name: String, state: State<'_, AppState>) -> Result<String, AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || crate::git::branches::merge_branch(&path, &name))
        .await
        .map_err(|e| AppError::Other(e.to_string()))?
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn rebase_onto(onto: String, state: State<'_, AppState>) -> Result<String, AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || crate::git::branches::rebase_onto(&path, &onto))
        .await
        .map_err(|e| AppError::Other(e.to_string()))?
        .map_err(AppError::from)
}
