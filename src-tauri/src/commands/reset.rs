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
pub async fn reset_to_commit(
    oid: String,
    mode: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&path)?;
        crate::git::reset::reset_to_commit(&repo, &oid, &mode)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}

#[tauri::command]
pub async fn revert_commit(oid: String, state: State<'_, AppState>) -> Result<String, AppError> {
    let path = get_path(&state)?;
    tokio::task::spawn_blocking(move || crate::git::reset::revert_commit(&path, &oid))
        .await
        .map_err(|e| AppError::Other(e.to_string()))?
        .map_err(AppError::from)
}
