use git2::Repository;
use std::path::Path;

use super::error::GitError;
use crate::types::RepoInfo;

pub fn open_repo(path: &str) -> Result<RepoInfo, GitError> {
    let repo = Repository::open(path)?;
    repo_info(&repo, path)
}

pub fn discover_repo(path: &str) -> Result<RepoInfo, GitError> {
    let repo = Repository::discover(path)?;
    let workdir = repo
        .workdir()
        .or_else(|| Some(repo.path()))
        .and_then(|p| p.to_str())
        .unwrap_or(path)
        .to_string();
    repo_info(&repo, &workdir)
}

pub fn clone_repo(url: &str, into_path: &str) -> Result<RepoInfo, GitError> {
    let repo = git2::build::RepoBuilder::new().clone(url, Path::new(into_path))?;
    repo_info(&repo, into_path)
}

fn repo_info(repo: &Repository, path: &str) -> Result<RepoInfo, GitError> {
    let head_branch = repo
        .head()
        .ok()
        .and_then(|h| {
            if h.is_branch() {
                h.shorthand().map(String::from)
            } else {
                None
            }
        });

    let head_oid = repo
        .head()
        .ok()
        .and_then(|h| h.target())
        .map(|oid| format!("{:.7}", oid));

    Ok(RepoInfo {
        path: path.to_string(),
        head_branch,
        head_oid,
        is_bare: repo.is_bare(),
    })
}
