use std::sync::Mutex;

pub struct AppState {
    pub repo_path: Mutex<Option<String>>,
    pub watcher: Mutex<Option<notify::RecommendedWatcher>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            repo_path: Mutex::new(None),
            watcher: Mutex::new(None),
        }
    }
}
