use tauri::State;

use crate::error::AppError;
use crate::state::AppState;
use crate::types::GraphPayload;

#[tauri::command]
pub async fn get_graph(
    max_count: Option<usize>,
    state: State<'_, AppState>,
) -> Result<GraphPayload, AppError> {
    let path = state
        .repo_path
        .lock()
        .unwrap()
        .clone()
        .ok_or(AppError::NoRepo)?;

    let limit = max_count.unwrap_or(2000);

    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&path)?;
        let raw_commits = crate::graph::walk::walk_commits(&repo, limit)?;
        let total = raw_commits.len();
        let rows = crate::graph::lanes::assign_lanes(raw_commits);
        Ok::<GraphPayload, crate::git::error::GitError>(GraphPayload { rows, total })
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::from)
}
