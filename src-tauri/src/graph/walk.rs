use git2::{Oid, Repository, Sort};
use std::collections::HashMap;

use crate::git::error::GitError;
use crate::types::{RefKind, RefLabel};

pub struct RawCommit {
    pub oid: Oid,
    pub parents: Vec<Oid>,
    pub summary: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
    pub refs: Vec<RefLabel>,
}

pub fn walk_commits(repo: &Repository, max_count: usize) -> Result<Vec<RawCommit>, GitError> {
    let ref_map = build_ref_map(repo)?;

    let mut revwalk = repo.revwalk()?;
    revwalk.push_glob("refs/*")?;
    revwalk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME)?;

    let mut commits = Vec::new();

    for oid_result in revwalk.take(max_count) {
        let oid = oid_result?;
        let commit = repo.find_commit(oid)?;

        let parents: Vec<Oid> = commit.parent_ids().collect();
        let summary = commit.summary().unwrap_or("").to_string();
        let author = commit.author();
        let author_name = author.name().unwrap_or("").to_string();
        let author_email = author.email().unwrap_or("").to_string();
        let timestamp = commit.time().seconds();

        let refs = ref_map.get(&oid).cloned().unwrap_or_default();

        commits.push(RawCommit {
            oid,
            parents,
            summary,
            author_name,
            author_email,
            timestamp,
            refs,
        });
    }

    Ok(commits)
}

fn build_ref_map(repo: &Repository) -> Result<HashMap<Oid, Vec<RefLabel>>, GitError> {
    let mut map: HashMap<Oid, Vec<RefLabel>> = HashMap::new();

    let head_oid = repo.head().ok().and_then(|h| h.target());

    for reference in repo.references()? {
        let reference = reference?;
        let Some(name) = reference.shorthand() else {
            continue;
        };
        let Some(oid) = reference.target() else {
            continue;
        };

        let is_head = Some(oid) == head_oid && reference.is_branch();

        let kind = if reference.is_tag() {
            RefKind::Tag
        } else if reference.is_remote() {
            RefKind::RemoteBranch
        } else {
            RefKind::LocalBranch
        };

        map.entry(oid).or_default().push(RefLabel {
            name: name.to_string(),
            kind,
            is_head,
        });
    }

    Ok(map)
}
