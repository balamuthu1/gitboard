import { useEffect, useCallback } from "react";
import { useGraphStore } from "../../store/graphStore";
import { useRepoStore } from "../../store/repoStore";
import { useRepoWatcher } from "../../hooks/useRepoWatcher";
import { useVirtualList } from "../../hooks/useVirtualList";
import { GraphCanvas } from "./GraphCanvas";
import { CommitRowItem } from "./CommitRow";

const ROW_HEIGHT = 24;
const LANE_WIDTH = 16;

export function CommitGraph() {
  const { rows, selectedOid, isLoading, loadGraph, selectCommit } = useGraphStore();
  const { repoInfo } = useRepoStore();

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

  return (
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
  );
}
