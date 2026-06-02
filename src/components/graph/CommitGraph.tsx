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

  const { containerRef, visibleStart, visibleEnd, totalHeight, offsetTop, viewportHeight } =
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
        {/* Full-height spacer gives the scrollbar correct proportions. */}
        <div style={{ height: totalHeight, position: "relative" }}>
          {/*
            The canvas is sticky so it stays anchored to the top of the
            viewport while the content scrolls. It's only as tall as the
            viewport, avoiding the WebKit canvas-height limit.
          */}
          <GraphCanvas
            rows={rows}
            visibleStart={visibleStart}
            visibleEnd={visibleEnd}
            viewportHeight={viewportHeight}
            maxLane={maxLane}
            selectedOid={selectedOid}
          />

          {/*
            Text rows sit beside the graph panel. index=i (not visibleStart+i)
            because the parent wrapper is already offset by offsetTop.
          */}
          <div style={{ position: "absolute", top: offsetTop, left: GRAPH_PANEL_WIDTH, right: 0 }}>
            {rows.slice(visibleStart, visibleEnd).map((row, i) => (
              <CommitRowItem
                key={row.oid}
                row={row}
                index={i}
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
