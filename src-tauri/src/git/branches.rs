use git2::{BranchType, Repository};

use super::error::GitError;
use crate::types::BranchInfo;

pub fn list_branches(repo: &Repository) -> Result<Vec<BranchInfo>, GitError> {
    let head_oid = repo.head().ok().and_then(|h| h.target());

    let mut branches: Vec<BranchInfo> = Vec::new();

    for branch_result in repo.branches(None)? {
        let (branch, branch_type) = branch_result?;
        let is_remote = branch_type == BranchType::Remote;

        let name = branch
            .name()?
            .unwrap_or("")
            .to_string();

        if name.is_empty() {
            continue;
        }

        let is_head = branch.is_head();

        let commit = branch.get().peel_to_commit().ok();
        let head_oid = commit.as_ref().map(|c| format!("{:.7}", c.id()));
        let head_summary = commit.as_ref().and_then(|c| c.summary().map(String::from));

        let upstream = if !is_remote {
            branch.upstream().ok().and_then(|u| {
                u.name().ok().flatten().map(String::from)
            })
        } else {
            None
        };

        let (ahead, behind) = if let (Some(upstream_name), Some(local_oid)) =
            (&upstream, commit.as_ref().map(|c| c.id()))
        {
            if let Ok(upstream_ref) = repo.find_reference(&format!("refs/remotes/{}", upstream_name)) {
                if let Some(upstream_oid) = upstream_ref.target() {
                    repo.graph_ahead_behind(local_oid, upstream_oid)
                        .unwrap_or((0, 0))
                } else {
                    (0, 0)
                }
            } else {
                (0, 0)
            }
        } else {
            (0, 0)
        };

        branches.push(BranchInfo {
            name,
            is_head,
            is_remote,
            upstream,
            ahead,
            behind,
            head_oid,
            head_summary,
        });
    }

    // HEAD first, then locals alphabetically, then remotes alphabetically.
    branches.sort_by(|a, b| {
        match (a.is_head, b.is_head) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => match (a.is_remote, b.is_remote) {
                (false, true) => std::cmp::Ordering::Less,
                (true, false) => std::cmp::Ordering::Greater,
                _ => a.name.cmp(&b.name),
            },
        }
    });

    Ok(branches)
}

pub fn checkout_branch(repo: &Repository, name: &str) -> Result<(), GitError> {
    let (obj, reference) = repo.revparse_ext(name)?;
    repo.checkout_tree(&obj, None)?;
    match reference {
        Some(r) => repo.set_head(r.name().unwrap_or(name))?,
        None => repo.set_head_detached(obj.id())?,
    }
    Ok(())
}

pub fn checkout_commit(repo: &Repository, oid_str: &str) -> Result<(), GitError> {
    let oid = git2::Oid::from_str(oid_str)?;
    let commit = repo.find_commit(oid)?;
    let obj = commit.as_object();
    repo.checkout_tree(obj, None)?;
    repo.set_head_detached(oid)?;
    Ok(())
}
