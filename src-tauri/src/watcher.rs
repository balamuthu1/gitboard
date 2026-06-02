use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use tauri::{AppHandle, Emitter};

pub fn start_watcher(app: AppHandle, repo_path: &str) -> notify::Result<RecommendedWatcher> {
    let git_dir = Path::new(repo_path).join(".git");

    let mut watcher = RecommendedWatcher::new(
        move |res: notify::Result<notify::Event>| {
            if let Ok(event) = res {
                if should_emit(&event) {
                    let _ = app.emit("repo-changed", ());
                }
            }
        },
        Config::default(),
    )?;

    watcher.watch(&git_dir, RecursiveMode::Recursive)?;
    Ok(watcher)
}

fn should_emit(event: &notify::Event) -> bool {
    use notify::EventKind::*;
    matches!(event.kind, Create(_) | Modify(_) | Remove(_))
        && event.paths.iter().any(|p| {
            let path_str = p.to_string_lossy();
            // Ignore noisy write-lock and object pack files.
            !path_str.contains("index.lock")
                && !path_str.contains(".git/objects/pack")
        })
}
