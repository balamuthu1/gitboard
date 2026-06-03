mod commands;
mod error;
mod git;
mod graph;
mod state;
mod types;
mod watcher;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::branches::list_branches,
            commands::branches::checkout_branch,
            commands::branches::checkout_commit,
            commands::branches::create_branch,
            commands::branches::delete_branch,
            commands::branches::merge_branch,
            commands::branches::rebase_onto,
            commands::repo::open_repo,
            commands::repo::discover_repo,
            commands::repo::clone_repo,
            commands::repo::close_repo,
            commands::status::get_status,
            commands::status::stage_path,
            commands::status::unstage_path,
            commands::status::stage_all,
            commands::status::discard_changes,
            commands::diff::diff_file,
            commands::commit::create_commit,
            commands::commit::amend_commit,
            commands::graph::get_graph,
            commands::remote::fetch_all,
            commands::remote::pull_branch,
            commands::remote::push_branch,
            commands::remote::push_set_upstream,
            commands::reset::reset_to_commit,
            commands::reset::revert_commit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
