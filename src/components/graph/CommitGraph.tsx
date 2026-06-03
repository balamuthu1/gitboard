import { useEffect, useCallback } from "react";
import { useGraphStore } from "../../store/graphStore";
import { useRepoStore } from "../../store/repoStore";
import { useBranchStore } from "../../store/branchStore";
import { useRepoWatcher } from "../../hooks/useRepoWatcher";
import { useVirtualList } from "../../hooks/useVirtualList";
import { GraphCanvas, ROW_HEIGHT, GRAPH_PANEL_WIDTH } from "./GraphCanvas";
import { CommitRowItem } from "./CommitRow";

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

  // containerRef is attached unconditionally so the ResizeObserver always fires.
  const { containerRef, visibleStart, visibleEnd, totalHeight, viewportHeight, scrollTop } =
    useVirtualList(rows.length, ROW_HEIGHT);

  const handleCheckoutCommit = async (oid: string) => {
    await checkoutDetached(oid);
    await refreshStatus();
    await loadGraph();
    await loadBranches();
  };

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

      {/* containerRef is ALWAYS on this div — no early returns above can skip it */}
      <div
        className="commit-graph"
        ref={containerRef}
        style={{ overflow: "auto", position: "relative" }}
      >
        {!repoInfo ? (
          <div className="graph-empty">Open a repository to see the commit graph.</div>
        ) : isLoading && rows.length === 0 ? (
          <div className="graph-loading">Loading graph…</div>
        ) : (
          <div style={{ height: totalHeight, position: "relative" }}>
            <GraphCanvas
              rows={rows}
              visibleStart={visibleStart}
              visibleEnd={visibleEnd}
              viewportHeight={viewportHeight}
              scrollTop={scrollTop}
              maxLane={maxLane}
              selectedOid={selectedOid}
            />

            {rows.slice(visibleStart, visibleEnd).map((row, i) => (
              <div
                key={row.oid}
                style={{
                  position: "absolute",
                  top: (visibleStart + i) * ROW_HEIGHT,
                  left: GRAPH_PANEL_WIDTH,
                  right: 0,
                  height: ROW_HEIGHT,
                  overflow: "hidden",
                }}
              >
                <CommitRowItem
                  row={row}
                  isSelected={row.oid === selectedOid}
                  onClick={() => selectCommit(row.oid === selectedOid ? null : row.oid)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
