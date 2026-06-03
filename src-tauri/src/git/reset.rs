use git2::Repository;

use super::error::GitError;
use super::util::run_git;

pub fn reset_to_commit(repo: &Repository, oid_str: &str, mode: &str) -> Result<(), GitError> {
    let oid = git2::Oid::from_str(oid_str)?;
    let commit = repo.find_commit(oid)?;
    let reset_type = match mode {
        "soft" => git2::ResetType::Soft,
        "hard" => git2::ResetType::Hard,
        _ => git2::ResetType::Mixed,
    };
    repo.reset(commit.as_object(), reset_type, None)?;
    Ok(())
}

pub fn revert_commit(path: &str, oid_str: &str) -> Result<String, GitError> {
    run_git(path, &["revert", "--no-commit", oid_str])
}
