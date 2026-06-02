import { useEffect, useCallback } from "react";
import { useGraphStore } from "../../store/graphStore";
import { useRepoStore } from "../../store/repoStore";
import { useBranchStore } from "../../store/branchStore";
import { useRepoWatcher } from "../../hooks/useRepoWatcher";
import { useVirtualList } from "../../hooks/useVirtualList";
import { GraphCanvas } from "./GraphCanvas";
import { CommitRowItem } from "./CommitRow";

const ROW_HEIGHT = 24;
const LANE_WIDTH = 16;

export function CommitGraph() {
  const { rows, selectedOid, isLoading, loadGraph, selectCommit } = useGraphStore();
  const { repoInfo, refreshStatus } = useRepoStore();
  const { checkoutDetached, loadBranches } = useBranchStore();

  const onRepoChanged = useCallback(() => {
    loadGraph();
  }, [loadGraph]);

  useRepoWatcher(onRepoChanged);

  useEffect(() => {
    if (repoInfo) loadGraph();
  }, [repoInfo, loadGraph]);

  const maxLane = rows.reduce((m, r) => Math.max(m, r.lane), 0);
  const canvasWidth = (maxLane + 1) * LANE_WIDTH + LANE_WIDTH;

  const { containerRef, visibleStart, visibleEnd, totalHeight, offsetTop } =
    useVirtualList(rows.length, ROW_HEIGHT);

  const handleCheckoutCommit = async (oid: string) => {
    await checkoutDetached(oid);
    await refreshStatus();
    await loadGraph();
    await loadBranches();
  };

  if (!repoInfo) {
    return (
      <div className="graph-empty">
        Open a repository to see the commit graph.
      </div>
    );
  }

  if (isLoading && rows.length === 0) {
    return <div className="graph-loading">Loading graph…</div>;
  }

  const selectedRow = selectedOid ? rows.find((r) => r.oid === selectedOid) : null;

  return (
    <div className="commit-graph-wrapper">
      {selectedRow && (
        <div className="graph-commit-bar">
          <span className="graph-commit-bar-oid">{selectedRow.short_oid}</span>
          <span className="graph-commit-bar-summary">{selectedRow.summary}</span>
          <button onClick={() => handleCheckoutCommit(selectedRow.oid)}>
            Checkout (detached)
          </button>
          <button onClick={() => selectCommit(null)}>✕</button>
        </div>
      )}
    <div className="commit-graph" ref={containerRef} style={{ overflow: "auto", position: "relative" }}>
      {/* Full-height spacer so the scrollbar reflects all commits. */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {/* Canvas for graph lines and dots — covers full graph height. */}
        <div style={{ position: "absolute", top: 0, left: 0 }}>
          <GraphCanvas
            rows={rows}
            visibleStart={visibleStart}
            visibleEnd={visibleEnd}
            maxLane={maxLane}
            selectedOid={selectedOid}
          />
        </div>

        {/* Text rows — only render visible range. */}
        <div style={{ position: "absolute", top: offsetTop, left: canvasWidth, right: 0 }}>
          {rows.slice(visibleStart, visibleEnd).map((row, i) => (
            <CommitRowItem
              key={row.oid}
              row={row}
              index={visibleStart + i}
              canvasWidth={0}
              isSelected={row.oid === selectedOid}
              onClick={() => selectCommit(row.oid === selectedOid ? null : row.oid)}
            />
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}
