use git2::Oid;

use crate::types::{CommitRow, Edge, EdgeKind};

use super::walk::RawCommit;

/// Assigns a visual lane (column) and edges to each commit.
///
/// All edges go **downward** — from the center of this row to the center of the
/// row below.  There are three kinds:
///
/// * `Straight` – a lane other than this commit's own passes straight through.
/// * `Fork`     – this commit spawns a new lane for an extra parent.
/// * `Merge`    – this commit's own lane converges into another lane because
///                the first parent is already claimed by that lane.
///
/// The renderer draws the **own-lane continuation** (straight down to first
/// parent) separately, unless a `Merge` edge from `own_lane` is present.
pub fn assign_lanes(commits: Vec<RawCommit>) -> Vec<CommitRow> {
    let mut active_lanes: Vec<Option<Oid>> = Vec::new();
    let mut lane_colors: Vec<Option<usize>> = Vec::new();
    let mut next_color: usize = 0;

    let mut rows = Vec::with_capacity(commits.len());

    for raw in commits {
        let mut edges: Vec<Edge> = Vec::new();

        // Find the single lane expecting this commit (at most one with this algorithm).
        let own_lane = active_lanes
            .iter()
            .position(|s| *s == Some(raw.oid))
            .unwrap_or_else(|| {
                // New branch tip — reuse a free slot or extend.
                active_lanes
                    .iter()
                    .position(|s| s.is_none())
                    .unwrap_or_else(|| {
                        active_lanes.push(None);
                        lane_colors.push(None);
                        active_lanes.len() - 1
                    })
            });

        while lane_colors.len() <= own_lane {
            lane_colors.push(None);
        }

        if lane_colors[own_lane].is_none() {
            lane_colors[own_lane] = Some(next_color);
            next_color += 1;
        }
        let own_color = lane_colors[own_lane].unwrap();

        // Straight pass-through edges for all other occupied lanes.
        for (i, slot) in active_lanes.iter().enumerate() {
            if slot.is_none() || i == own_lane {
                continue;
            }
            let color = lane_colors.get(i).copied().flatten().unwrap_or(0);
            edges.push(Edge {
                from_lane: i,
                to_lane: i,
                color_index: color,
                kind: EdgeKind::Straight,
            });
        }

        // Free own slot before placing parents.
        active_lanes[own_lane] = None;

        // Place first parent (or detect convergence).
        if let Some(&first_parent) = raw.parents.first() {
            // If first_parent is already claimed by another active lane, our lane
            // converges into that lane — emit a downward Merge edge and free ours.
            let existing = active_lanes
                .iter()
                .enumerate()
                .find(|(i, s)| *i != own_lane && **s == Some(first_parent))
                .map(|(i, _)| i);

            if let Some(target) = existing {
                edges.push(Edge {
                    from_lane: own_lane,
                    to_lane: target,
                    color_index: own_color,
                    kind: EdgeKind::Merge,
                });
                // Lane is closed; color is freed.
                if let Some(c) = lane_colors.get_mut(own_lane) {
                    *c = None;
                }
            } else {
                active_lanes[own_lane] = Some(first_parent);
                // Color is inherited automatically.
            }
        } else {
            // Root commit — free color too.
            if let Some(c) = lane_colors.get_mut(own_lane) {
                *c = None;
            }
        }

        // Extra parents: fork into existing or new lanes.
        for &extra_parent in raw.parents.iter().skip(1) {
            let existing = active_lanes.iter().position(|s| *s == Some(extra_parent));

            if let Some(pos) = existing {
                edges.push(Edge {
                    from_lane: own_lane,
                    to_lane: pos,
                    color_index: own_color,
                    kind: EdgeKind::Fork,
                });
            } else {
                let new_lane = active_lanes
                    .iter()
                    .position(|s| s.is_none())
                    .unwrap_or_else(|| {
                        active_lanes.push(None);
                        lane_colors.push(None);
                        active_lanes.len() - 1
                    });
                while lane_colors.len() <= new_lane {
                    lane_colors.push(None);
                }
                lane_colors[new_lane] = Some(next_color);
                let new_color = next_color;
                next_color += 1;
                edges.push(Edge {
                    from_lane: own_lane,
                    to_lane: new_lane,
                    color_index: new_color,
                    kind: EdgeKind::Fork,
                });
                active_lanes[new_lane] = Some(extra_parent);
            }
        }

        // Compact trailing None slots.
        while active_lanes.last() == Some(&None) {
            active_lanes.pop();
            lane_colors.pop();
        }

        rows.push(CommitRow {
            oid: raw.oid.to_string(),
            short_oid: format!("{:.7}", raw.oid),
            summary: raw.summary,
            author_name: raw.author_name,
            author_email: raw.author_email,
            timestamp: raw.timestamp,
            refs: raw.refs,
            parents: raw.parents.iter().map(|p| p.to_string()).collect(),
            lane: own_lane,
            lane_color: own_color,
            edges,
        });
    }

    rows
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{EdgeKind, RefLabel, RefKind};

    fn make_oid(s: &str) -> Oid {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut h = DefaultHasher::new();
        s.hash(&mut h);
        let v = h.finish();
        let hash_bytes = v.to_le_bytes();
        let mut bytes = [0u8; 20];
        for i in 0..20 {
            bytes[i] = hash_bytes[i % 8] ^ (i as u8 + 1);
        }
        Oid::from_bytes(&bytes).expect("invalid oid bytes")
    }

    fn make_commit(oid: &str, parents: &[&str]) -> RawCommit {
        RawCommit {
            oid: make_oid(oid),
            parents: parents.iter().map(|p| make_oid(p)).collect(),
            summary: format!("commit {}", oid),
            author_name: "Test".to_string(),
            author_email: "test@example.com".to_string(),
            timestamp: 0,
            refs: Vec::new(),
        }
    }

    fn make_commit_with_refs(oid: &str, parents: &[&str], ref_names: &[&str]) -> RawCommit {
        let mut c = make_commit(oid, parents);
        c.refs = ref_names
            .iter()
            .map(|name| RefLabel {
                name: name.to_string(),
                kind: RefKind::LocalBranch,
                is_head: false,
            })
            .collect();
        c
    }

    #[test]
    fn test_linear_history() {
        let commits = vec![
            make_commit("aaa", &["bbb"]),
            make_commit("bbb", &["ccc"]),
            make_commit("ccc", &[]),
        ];
        let rows = assign_lanes(commits);
        assert_eq!(rows.len(), 3);
        for row in &rows {
            assert_eq!(row.lane, 0, "expected lane 0 for {}", row.short_oid);
        }
        // All edges that exist must be Straight (no forks or merges in a line).
        for row in &rows {
            for edge in &row.edges {
                assert_eq!(edge.kind, EdgeKind::Straight);
            }
        }
    }

    #[test]
    fn test_root_commit_no_edges() {
        let commits = vec![make_commit("aaa", &[])];
        let rows = assign_lanes(commits);
        assert_eq!(rows[0].lane, 0);
        assert!(rows[0].edges.is_empty());
    }

    #[test]
    fn test_simple_merge() {
        // Graph (newest first):
        //   M  (merge, parents: [A, B])
        //   A  (parent: C)
        //   B  (parent: C)  ← B detects C already claimed → emits Merge edge
        //   C  (root)       ← only one lane waiting → no edges
        let commits = vec![
            make_commit("M", &["A", "B"]),
            make_commit("A", &["C"]),
            make_commit("B", &["C"]),
            make_commit("C", &[]),
        ];
        let rows = assign_lanes(commits);
        assert_eq!(rows.len(), 4);

        // M has a Fork edge for second parent (B's lane).
        assert_eq!(rows[0].lane, 0);
        let m_forks: Vec<_> = rows[0].edges.iter().filter(|e| e.kind == EdgeKind::Fork).collect();
        assert!(!m_forks.is_empty(), "M should fork a lane for extra parent B");

        // B emits the convergence Merge edge (B's lane folds into A's lane going down).
        let b_merges: Vec<_> = rows[2].edges.iter().filter(|e| e.kind == EdgeKind::Merge).collect();
        assert!(!b_merges.is_empty(), "B should emit a downward Merge edge as it converges");
        // The merge edge goes from B's lane down to A's lane (where C lives).
        assert_eq!(b_merges[0].from_lane, rows[2].lane);

        // C is a clean root — single lane, no edges.
        assert!(rows[3].edges.is_empty(), "C (root, single lane) should have no edges");
    }

    #[test]
    fn test_parallel_branches() {
        // Two independent lines — must be in different lanes.
        let commits = vec![
            make_commit("A1", &["A2"]),
            make_commit("B1", &["B2"]),
            make_commit("A2", &[]),
            make_commit("B2", &[]),
        ];
        let rows = assign_lanes(commits);
        assert_eq!(rows.len(), 4);
        assert_ne!(rows[0].lane, rows[1].lane, "parallel branches must be in different lanes");
    }

    #[test]
    fn test_octopus_merge() {
        // M merges three parents.
        let commits = vec![
            make_commit("M", &["P1", "P2", "P3"]),
            make_commit("P1", &[]),
            make_commit("P2", &[]),
            make_commit("P3", &[]),
        ];
        let rows = assign_lanes(commits);
        let forks: Vec<_> = rows[0].edges.iter().filter(|e| e.kind == EdgeKind::Fork).collect();
        assert_eq!(forks.len(), 2, "octopus merge should have 2 Fork edges (for P2, P3)");
    }

    #[test]
    fn test_lane_color_unique_per_active_lane() {
        // All active lanes at any point must have distinct color_index values.
        let commits = vec![
            make_commit("M", &["A", "B"]),
            make_commit("A", &["C"]),
            make_commit("B", &["C"]),
            make_commit("C", &["D"]),
            make_commit("D", &[]),
        ];
        let rows = assign_lanes(commits);
        // Within each row, no two edges from different source lanes share a color.
        for row in &rows {
            let mut seen: std::collections::HashMap<usize, usize> = Default::default();
            for edge in &row.edges {
                if let Some(&prev) = seen.get(&edge.from_lane) {
                    assert_eq!(prev, edge.color_index,
                        "inconsistent color for lane {} in row {}", edge.from_lane, row.short_oid);
                } else {
                    seen.insert(edge.from_lane, edge.color_index);
                }
            }
        }
    }

    #[test]
    fn test_ref_labels_preserved() {
        let commits = vec![
            make_commit_with_refs("aaa", &["bbb"], &["main", "HEAD"]),
            make_commit("bbb", &[]),
        ];
        let rows = assign_lanes(commits);
        assert_eq!(rows[0].refs.len(), 2);
    }

    #[test]
    fn test_lane_color_stored_on_row() {
        let commits = vec![
            make_commit("A1", &["A2"]),
            make_commit("B1", &["B2"]),
            make_commit("A2", &[]),
            make_commit("B2", &[]),
        ];
        let rows = assign_lanes(commits);
        // A1 and B1 are in different lanes and must have different lane_color values.
        assert_ne!(rows[0].lane_color, rows[1].lane_color,
            "parallel branches must have distinct lane colors");
    }

    #[test]
    fn test_single_commit_many_descendants() {
        let ids: Vec<String> = (0..20).map(|i| format!("commit{:04}", i)).collect();
        let mut commits: Vec<RawCommit> = ids
            .windows(2)
            .map(|w| make_commit(&w[0], &[&w[1]]))
            .collect();
        commits.push(make_commit(&ids[19], &[]));

        let rows = assign_lanes(commits);
        for row in &rows {
            assert_eq!(row.lane, 0);
        }
    }
}
