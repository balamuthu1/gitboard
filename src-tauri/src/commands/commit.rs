use tauri::State;

use crate::error::AppError;
use crate::state::AppState;
use crate::types::CommitSummary;

#[tauri::command]
pub async fn create_commit(
    message: String,
    state: State<'_, AppState>,
) -> Result<CommitSummary, AppError> {
    let path = state
        .repo_path
        .lock()
        .unwrap()
        .clone()
        .ok_or(AppError::NoRepo)?;

    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&path)?;
        crate::git::commit::create_commit(&repo, &message)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}

#[tauri::command]
pub async fn amend_commit(
    message: Option<String>,
    state: State<'_, AppState>,
) -> Result<CommitSummary, AppError> {
    let path = state
        .repo_path
        .lock()
        .unwrap()
        .clone()
        .ok_or(AppError::NoRepo)?;

    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&path)?;
        crate::git::commit::amend_commit(&repo, message.as_deref())
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}
