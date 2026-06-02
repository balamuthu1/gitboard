use git2::{Repository, Status, StatusOptions};

use super::error::GitError;
use crate::types::{FileStatus, StatusEntry};

pub fn get_status(repo: &Repository) -> Result<Vec<StatusEntry>, GitError> {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false)
        .renames_head_to_index(true)
        .renames_index_to_workdir(true);

    let statuses = repo.statuses(Some(&mut opts))?;
    let mut entries = Vec::new();

    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let s = entry.status();

        let index_status = index_file_status(s);
        let workdir_status = workdir_file_status(s);

        if index_status == FileStatus::Unmodified && workdir_status == FileStatus::Unmodified {
            continue;
        }

        let old_path = entry.head_to_index().and_then(|d| {
            if s.contains(Status::INDEX_RENAMED) {
                d.old_file().path().and_then(|p| p.to_str()).map(String::from)
            } else {
                None
            }
        });

        entries.push(StatusEntry {
            path,
            old_path,
            index_status,
            workdir_status,
        });
    }

    Ok(entries)
}

pub fn stage_path(repo: &Repository, path: &str) -> Result<(), GitError> {
    let mut index = repo.index()?;
    index.add_path(std::path::Path::new(path))?;
    index.write()?;
    Ok(())
}

pub fn unstage_path(repo: &Repository, path: &str) -> Result<(), GitError> {
    let head = repo.head()?.peel_to_commit()?;
    let obj = head.as_object();
    repo.reset_default(Some(obj), std::iter::once(path))?;
    Ok(())
}

pub fn stage_all(repo: &Repository) -> Result<(), GitError> {
    let mut index = repo.index()?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.write()?;
    Ok(())
}

pub fn discard_changes(repo: &Repository, path: &str) -> Result<(), GitError> {
    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.path(path).force();
    repo.checkout_index(None, Some(&mut checkout_opts))?;
    Ok(())
}

fn index_file_status(s: Status) -> FileStatus {
    if s.contains(Status::INDEX_NEW) {
        FileStatus::Added
    } else if s.contains(Status::INDEX_MODIFIED) {
        FileStatus::Modified
    } else if s.contains(Status::INDEX_DELETED) {
        FileStatus::Deleted
    } else if s.contains(Status::INDEX_RENAMED) {
        FileStatus::Renamed
    } else if s.contains(Status::CONFLICTED) {
        FileStatus::Conflicted
    } else {
        FileStatus::Unmodified
    }
}

fn workdir_file_status(s: Status) -> FileStatus {
    if s.contains(Status::WT_NEW) {
        FileStatus::Untracked
    } else if s.contains(Status::WT_MODIFIED) {
        FileStatus::Modified
    } else if s.contains(Status::WT_DELETED) {
        FileStatus::Deleted
    } else if s.contains(Status::WT_RENAMED) {
        FileStatus::Renamed
    } else if s.contains(Status::CONFLICTED) {
        FileStatus::Conflicted
    } else {
        FileStatus::Unmodified
    }
}
