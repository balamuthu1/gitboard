use git2::{DiffFormat, DiffOptions, Repository};

use super::error::GitError;
use crate::types::{DiffHunk, DiffLine, DiffLineKind, DiffResult};

pub fn diff_file(repo: &Repository, path: &str, staged: bool) -> Result<DiffResult, GitError> {
    let mut opts = DiffOptions::new();
    opts.pathspec(path);

    let diff = if staged {
        let head_tree = repo
            .head()
            .ok()
            .and_then(|h| h.peel_to_tree().ok());
        repo.diff_tree_to_index(head_tree.as_ref(), None, Some(&mut opts))?
    } else {
        repo.diff_index_to_workdir(None, Some(&mut opts))?
    };

    let stats = diff.stats()?;
    let is_binary = stats.files_changed() > 0
        && diff
            .deltas()
            .next()
            .map(|d| d.flags().is_binary())
            .unwrap_or(false);

    if is_binary {
        return Ok(DiffResult {
            path: path.to_string(),
            hunks: vec![],
            is_binary: true,
        });
    }

    let mut hunks: Vec<DiffHunk> = Vec::new();
    let mut current_hunk: Option<DiffHunk> = None;

    diff.print(DiffFormat::Patch, |_delta, hunk, line| {
        if let Some(h) = &hunk {
            let header = std::str::from_utf8(h.header()).unwrap_or("").to_string();
            match &current_hunk {
                Some(ch) if ch.header == header => {}
                _ => {
                    if let Some(finished) = current_hunk.take() {
                        hunks.push(finished);
                    }
                    current_hunk = Some(DiffHunk {
                        header,
                        lines: Vec::new(),
                    });
                }
            }
        }

        let kind = match line.origin() {
            '+' => DiffLineKind::Add,
            '-' => DiffLineKind::Remove,
            ' ' => DiffLineKind::Context,
            _ => return true,
        };

        let content = std::str::from_utf8(line.content())
            .unwrap_or("")
            .trim_end_matches('\n')
            .to_string();

        if let Some(hunk) = &mut current_hunk {
            hunk.lines.push(DiffLine {
                kind,
                old_lineno: line.old_lineno(),
                new_lineno: line.new_lineno(),
                content,
            });
        }

        true
    })?;

    if let Some(last) = current_hunk {
        hunks.push(last);
    }

    Ok(DiffResult {
        path: path.to_string(),
        hunks,
        is_binary: false,
    })
}
