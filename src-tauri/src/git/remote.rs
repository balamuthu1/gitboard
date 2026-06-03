use super::util::run_git;
use super::error::GitError;

pub fn fetch_all(path: &str) -> Result<String, GitError> {
    run_git(path, &["fetch", "--all", "--prune"])
}

pub fn pull(path: &str) -> Result<String, GitError> {
    run_git(path, &["pull"])
}

pub fn push(path: &str, remote: &str, branch: &str, force: bool) -> Result<String, GitError> {
    if force {
        run_git(path, &["push", "--force-with-lease", remote, branch])
    } else {
        run_git(path, &["push", remote, branch])
    }
}

pub fn push_set_upstream(path: &str, remote: &str, branch: &str) -> Result<String, GitError> {
    run_git(path, &["push", "--set-upstream", remote, branch])
}
