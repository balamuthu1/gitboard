use git2::Repository;

use super::error::GitError;
use crate::types::{CommitSummary, Signature};

pub fn create_commit(repo: &Repository, message: &str) -> Result<CommitSummary, GitError> {
    let sig = repo.signature()?;
    let mut index = repo.index()?;
    index.write()?;
    let tree_oid = index.write_tree()?;
    let tree = repo.find_tree(tree_oid)?;

    let parent_commit = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
    let parents: Vec<&git2::Commit> = parent_commit.iter().collect();

    let oid = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parents)?;
    commit_summary(repo, oid)
}

pub fn amend_commit(repo: &Repository, message: Option<&str>) -> Result<CommitSummary, GitError> {
    let head_commit = repo.head()?.peel_to_commit()?;

    let mut index = repo.index()?;
    index.write()?;
    let tree_oid = index.write_tree()?;
    let tree = repo.find_tree(tree_oid)?;

    let sig = repo.signature()?;
    let msg = message.unwrap_or_else(|| head_commit.message().unwrap_or(""));

    let oid = head_commit.amend(Some("HEAD"), Some(&sig), Some(&sig), None, Some(msg), Some(&tree))?;
    commit_summary(repo, oid)
}

fn commit_summary(repo: &Repository, oid: git2::Oid) -> Result<CommitSummary, GitError> {
    let commit = repo.find_commit(oid)?;
    let message = commit
        .summary()
        .unwrap_or("")
        .to_string();

    let author = commit.author();

    Ok(CommitSummary {
        oid: oid.to_string(),
        short_oid: format!("{:.7}", oid),
        message,
        author: Signature {
            name: author.name().unwrap_or("").to_string(),
            email: author.email().unwrap_or("").to_string(),
        },
        timestamp: commit.time().seconds(),
    })
}
