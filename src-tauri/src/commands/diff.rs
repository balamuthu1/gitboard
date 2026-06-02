use tauri::State;

use crate::error::AppError;
use crate::state::AppState;
use crate::types::DiffResult;

#[tauri::command]
pub async fn diff_file(
    path: String,
    staged: bool,
    state: State<'_, AppState>,
) -> Result<DiffResult, AppError> {
    let repo_path = state
        .repo_path
        .lock()
        .unwrap()
        .clone()
        .ok_or(AppError::NoRepo)?;

    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&repo_path)?;
        crate::git::diff::diff_file(&repo, &path, staged)
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}
