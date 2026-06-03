import { useEffect, useCallback, useState } from "react";
import { useGraphStore } from "../../store/graphStore";
import { useRepoStore } from "../../store/repoStore";
import { useBranchStore } from "../../store/branchStore";
import { useRepoWatcher } from "../../hooks/useRepoWatcher";
import { useVirtualList } from "../../hooks/useVirtualList";
import { GraphCanvas, ROW_HEIGHT } from "./GraphCanvas";
import { CommitRowItem, type ColWidths } from "./CommitRow";

const MIN_COL = 40;

const DEFAULT_COL_WIDTHS: ColWidths = {
  branchTag: 160,
  graph: 150,
  date: 88,
  author: 120,
  oid: 72,
};

interface ColHeaderProps {
  label: string;
  width?: number;
  flex?: boolean;
  onResize?: (e: React.MouseEvent) => void;
}

function ColHeader({ label, width, flex, onResize }: ColHeaderProps) {
  return (
    <div
      className={`graph-col-header${flex ? " graph-col-header-flex" : ""}`}
      style={width !== undefined ? { width } : undefined}
    >
      <span className="graph-col-header-label">{label}</span>
      {onResize && (
        <div className="col-resize-handle" onMouseDown={onResize} />
      )}
    </div>
  );
}

export function CommitGraph() {
  const { rows, selectedOid, isLoading, loadGraph, selectCommit } = useGraphStore();
  const { repoInfo, refreshStatus } = useRepoStore();
  const { checkoutDetached, loadBranches } = useBranchStore();
  const [colWidths, setColWidths] = useState<ColWidths>(DEFAULT_COL_WIDTHS);

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

  const startResize = (col: keyof ColWidths, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[col];
    const onMove = (ev: MouseEvent) => {
      setColWidths((prev) => ({
        ...prev,
        [col]: Math.max(MIN_COL, startW + ev.clientX - startX),
      }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

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

      {/* Column headers */}
      <div className="graph-col-headers">
        <ColHeader
          label="BRANCH / TAG"
          width={colWidths.branchTag}
          onResize={(e) => startResize("branchTag", e)}
        />
        <ColHeader
          label="GRAPH"
          width={colWidths.graph}
          onResize={(e) => startResize("graph", e)}
        />
        <ColHeader label="COMMIT MESSAGE" flex />
        <ColHeader
          label="DATE"
          width={colWidths.date}
          onResize={(e) => startResize("date", e)}
        />
        <ColHeader
          label="AUTHOR"
          width={colWidths.author}
          onResize={(e) => startResize("author", e)}
        />
        <ColHeader label="COMMIT" width={colWidths.oid} />
      </div>

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
              xOffset={colWidths.branchTag}
            />

            {rows.slice(visibleStart, visibleEnd).map((row, i) => (
              <div
                key={row.oid}
                style={{
                  position: "absolute",
                  top: (visibleStart + i) * ROW_HEIGHT,
                  left: 0,
                  right: 0,
                  height: ROW_HEIGHT,
                  overflow: "hidden",
                }}
              >
                <CommitRowItem
                  row={row}
                  isSelected={row.oid === selectedOid}
                  onClick={() => selectCommit(row.oid === selectedOid ? null : row.oid)}
                  colWidths={colWidths}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
