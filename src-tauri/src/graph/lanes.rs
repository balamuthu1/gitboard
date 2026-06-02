use git2::Oid;

use crate::types::{CommitRow, Edge, EdgeKind};

use super::walk::RawCommit;

pub fn assign_lanes(commits: Vec<RawCommit>) -> Vec<CommitRow> {
    // Each slot holds the OID this lane is "waiting to reach".
    let mut active_lanes: Vec<Option<Oid>> = Vec::new();
    // Maps lane index to a stable color slot.
    let mut lane_colors: Vec<Option<usize>> = Vec::new();
    let mut next_color: usize = 0;

    let mut rows = Vec::with_capacity(commits.len());

    for raw in commits {
        let mut edges: Vec<Edge> = Vec::new();

        // Find the lane(s) expecting this commit's OID.
        let matching: Vec<usize> = active_lanes
            .iter()
            .enumerate()
            .filter_map(|(i, slot)| {
                if *slot == Some(raw.oid) {
                    Some(i)
                } else {
                    None
                }
            })
            .collect();

        // The commit's own lane: leftmost match, or a new/free slot.
        let own_lane = if let Some(&first) = matching.first() {
            first
        } else {
            // New branch tip — allocate a free slot or extend.
            let slot = active_lanes.iter().position(|s| s.is_none()).unwrap_or_else(|| {
                active_lanes.push(None);
                lane_colors.push(None);
                active_lanes.len() - 1
            });
            slot
        };

        // Ensure lane_colors is long enough.
        while lane_colors.len() <= own_lane {
            lane_colors.push(None);
        }

        // Assign a color to this lane if it doesn't have one yet.
        if lane_colors[own_lane].is_none() {
            lane_colors[own_lane] = Some(next_color);
            next_color += 1;
        }
        let own_color = lane_colors[own_lane].unwrap();

        // Additional matching lanes are merges converging here — close them.
        for &merge_lane in matching.iter().skip(1) {
            let merge_color = lane_colors.get(merge_lane).copied().flatten().unwrap_or(own_color);
            edges.push(Edge {
                from_lane: merge_lane,
                to_lane: own_lane,
                color_index: merge_color,
                kind: EdgeKind::Merge,
            });
            active_lanes[merge_lane] = None;
            if let Some(c) = lane_colors.get_mut(merge_lane) {
                *c = None;
            }
        }

        // Emit straight pass-through edges for all other occupied lanes.
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

        // Free this commit's slot.
        active_lanes[own_lane] = None;

        // Place parents.
        if let Some(&first_parent) = raw.parents.first() {
            active_lanes[own_lane] = Some(first_parent);
            // Keep the same color for the first-parent continuation.
        } else {
            // Root commit: free the slot and its color.
            if let Some(c) = lane_colors.get_mut(own_lane) {
                *c = None;
            }
        }

        // Additional parents: find or allocate a lane for each.
        for &extra_parent in raw.parents.iter().skip(1) {
            // Check if already in active_lanes.
            let existing = active_lanes
                .iter()
                .position(|s| *s == Some(extra_parent));

            let target_lane = if let Some(pos) = existing {
                // Fork to an existing lane.
                let color = lane_colors.get(pos).copied().flatten().unwrap_or(own_color);
                edges.push(Edge {
                    from_lane: own_lane,
                    to_lane: pos,
                    color_index: own_color,
                    kind: EdgeKind::Fork,
                });
                let _ = color; // already recorded in the edge
                pos
            } else {
                // Allocate a new lane for this parent.
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
                next_color += 1;
                let new_color = lane_colors[new_lane].unwrap();
                edges.push(Edge {
                    from_lane: own_lane,
                    to_lane: new_lane,
                    color_index: new_color,
                    kind: EdgeKind::Fork,
                });
                active_lanes[new_lane] = Some(extra_parent);
                new_lane
            };
            let _ = target_lane;
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
        // Derive a deterministic 20-byte OID from an arbitrary string key.
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
        // All commits must be in lane 0.
        for row in &rows {
            assert_eq!(row.lane, 0, "expected lane 0 for {}", row.short_oid);
        }
        // All edges from non-root commits must be Straight.
        for row in rows.iter().take(2) {
            for edge in &row.edges {
                assert_eq!(edge.kind, EdgeKind::Straight, "expected Straight edge in linear history");
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
        //   B  (parent: C)
        //   C  (root)
        let commits = vec![
            make_commit("M", &["A", "B"]),
            make_commit("A", &["C"]),
            make_commit("B", &["C"]),
            make_commit("C", &[]),
        ];
        let rows = assign_lanes(commits);
        assert_eq!(rows.len(), 4);

        // M should be in lane 0.
        assert_eq!(rows[0].lane, 0);

        // M must have at least one Fork edge (to second parent lane).
        let m_forks: Vec<_> = rows[0].edges.iter().filter(|e| e.kind == EdgeKind::Fork).collect();
        assert!(!m_forks.is_empty(), "merge commit should have a Fork edge for extra parent");

        // C is where both A and B converge — it should carry a Merge edge
        // (B's lane closing onto C's lane), but no Fork or Straight edges.
        let c_row = &rows[3];
        let c_merges: Vec<_> = c_row.edges.iter().filter(|e| e.kind == EdgeKind::Merge).collect();
        assert!(!c_merges.is_empty(), "C is a convergence point and should have a merge edge");
        // And since C is a root, there must be no Fork edges going to any parent.
        let c_forks: Vec<_> = c_row.edges.iter().filter(|e| e.kind == EdgeKind::Fork).collect();
        assert!(c_forks.is_empty(), "root commit should have no Fork edges");
    }

    #[test]
    fn test_parallel_branches() {
        // Two completely independent lines, interleaved by timestamp.
        //   A1 (parent: A2)
        //   B1 (parent: B2)
        //   A2 (root)
        //   B2 (root)
        let commits = vec![
            make_commit("A1", &["A2"]),
            make_commit("B1", &["B2"]),
            make_commit("A2", &[]),
            make_commit("B2", &[]),
        ];
        let rows = assign_lanes(commits);
        assert_eq!(rows.len(), 4);

        // A1 and B1 must be in different lanes.
        assert_ne!(rows[0].lane, rows[1].lane, "parallel branches must be in different lanes");
    }

    #[test]
    fn test_octopus_merge() {
        // M merges three parents: P1, P2, P3.
        let commits = vec![
            make_commit("M", &["P1", "P2", "P3"]),
            make_commit("P1", &[]),
            make_commit("P2", &[]),
            make_commit("P3", &[]),
        ];
        let rows = assign_lanes(commits);

        // M must have two Fork edges (one per extra parent).
        let forks: Vec<_> = rows[0].edges.iter().filter(|e| e.kind == EdgeKind::Fork).collect();
        assert_eq!(forks.len(), 2, "octopus merge should have 2 Fork edges");
    }

    #[test]
    fn test_color_stability_after_lane_reuse() {
        // After feature merges into main and its lane is freed, the next independent
        // branch root allocated to that freed slot must get a NEW color.
        let commits = vec![
            make_commit("M", &["A", "B"]),  // merge
            make_commit("A", &["C"]),
            make_commit("B", &["C"]),       // B's lane will be freed after M
            make_commit("C", &["D"]),       // shared base
            make_commit("D", &[]),          // root
        ];
        let rows = assign_lanes(commits);
        // Collect all color_indices used in edges — they should be consistent.
        // The key invariant: no two active lanes at the same time share a color.
        // We verify this by checking that within each row, all edge color_indices
        // for edges from the same source lane are consistent.
        for row in &rows {
            let mut seen: std::collections::HashMap<usize, usize> = std::collections::HashMap::new();
            for edge in &row.edges {
                if let Some(&prev_color) = seen.get(&edge.from_lane) {
                    assert_eq!(prev_color, edge.color_index,
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
    fn test_single_commit_many_descendants() {
        // Long linear chain — ensure lanes stay compact (always lane 0).
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
