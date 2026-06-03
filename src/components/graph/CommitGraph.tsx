import { useEffect, useCallback, useState } from "react";
import { useGraphStore } from "../../store/graphStore";
import { useRepoStore } from "../../store/repoStore";
import { useBranchStore } from "../../store/branchStore";
import { useRepoWatcher } from "../../hooks/useRepoWatcher";
import { useVirtualList } from "../../hooks/useVirtualList";
import { GraphCanvas, ROW_HEIGHT } from "./GraphCanvas";
import { CommitRowItem, type ColWidths } from "./CommitRow";
import * as api from "../../api";

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
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detailMsg, setDetailMsg] = useState<string | null>(null);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const onRepoChanged = useCallback(() => {
    loadGraph();
  }, [loadGraph]);

  useRepoWatcher(onRepoChanged);

  useEffect(() => {
    if (repoInfo) loadGraph();
  }, [repoInfo, loadGraph]);

  // Auto-expand when a new commit is selected
  useEffect(() => {
    if (selectedOid) setDetailExpanded(true);
  }, [selectedOid]);

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

  const afterOp = async () => {
    setBusy(false);
    await Promise.all([loadGraph(), refreshStatus()]);
    selectCommit(null);
  };

  const handleReset = async (mode: "soft" | "mixed" | "hard") => {
    if (!selectedOid) return;
    const label = selectedOid.slice(0, 7);
    if (mode === "hard" && !confirm(`Hard reset to ${label}? This discards all uncommitted changes.`))
      return;
    setBusy(true);
    setDetailErr(null);
    setDetailMsg(null);
    try {
      await api.resetToCommit(selectedOid, mode);
      setDetailMsg(`Reset (${mode}) to ${label}`);
      await afterOp();
    } catch (e) {
      setDetailErr(String(e));
      setBusy(false);
    }
  };

  const handleRevert = async () => {
    if (!selectedOid) return;
    setBusy(true);
    setDetailErr(null);
    setDetailMsg(null);
    try {
      await api.revertCommit(selectedOid);
      setDetailMsg(`Reverted ${selectedOid.slice(0, 7)} — changes staged, commit to finish`);
      await afterOp();
    } catch (e) {
      setDetailErr(String(e));
      setBusy(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedOid) return;
    setBusy(true);
    setDetailErr(null);
    setDetailMsg(null);
    try {
      await checkoutDetached(selectedOid);
      await refreshStatus();
      await loadGraph();
      await loadBranches();
      setDetailMsg(`Checked out ${selectedOid.slice(0, 7)} (detached HEAD)`);
      setBusy(false);
    } catch (e) {
      setDetailErr(String(e));
      setBusy(false);
    }
  };

  const selectedRow = selectedOid ? rows.find((r) => r.oid === selectedOid) : null;

  const formatDate = (ts: number) => {
    return new Date(ts * 1000).toLocaleString();
  };

  return (
    <div className="commit-graph-wrapper">
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

      {/* Collapsible commit detail panel */}
      {selectedOid && selectedRow && (
        <div
          className={`commit-detail-panel${detailExpanded ? " commit-detail-panel-expanded" : ""}`}
        >
          <div className="commit-detail-header">
            <button
              className="commit-detail-toggle"
              onClick={() => setDetailExpanded((v) => !v)}
              title={detailExpanded ? "Collapse" : "Expand"}
            >
              {detailExpanded ? "▾" : "▸"}
            </button>
            <span className="commit-detail-hash">{selectedRow.short_oid}</span>
            <span className="commit-detail-title">{selectedRow.summary}</span>
            <button
              className="commit-detail-close"
              onClick={() => { selectCommit(null); setDetailMsg(null); setDetailErr(null); }}
              title="Deselect commit"
            >
              ×
            </button>
          </div>

          {detailExpanded && (
            <div className="commit-detail-body">
              <div className="commit-detail-meta">
                <span className="commit-detail-key">Author</span>
                <span className="commit-detail-val">
                  {selectedRow.author_name} &lt;{selectedRow.author_email}&gt;
                </span>
                <span className="commit-detail-key">Date</span>
                <span className="commit-detail-val">{formatDate(selectedRow.timestamp)}</span>
                <span className="commit-detail-key">Commit</span>
                <span className="commit-detail-val commit-detail-val-oid">{selectedRow.oid}</span>
                <span className="commit-detail-key">Parents</span>
                <span className="commit-detail-val commit-detail-val-oid">
                  {selectedRow.parents.length > 0
                    ? selectedRow.parents.map((p) => p.slice(0, 7)).join("  ")
                    : "none"}
                </span>
              </div>

              <div className="commit-detail-actions">
                <span className="commit-detail-actions-label">Reset HEAD to here:</span>
                <button disabled={busy} onClick={() => handleReset("soft")} title="Keep changes staged">
                  Soft
                </button>
                <button disabled={busy} onClick={() => handleReset("mixed")} title="Keep changes unstaged">
                  Mixed
                </button>
                <button
                  disabled={busy}
                  onClick={() => handleReset("hard")}
                  className="btn-danger"
                  title="Discard all changes"
                >
                  Hard ⚠
                </button>
                <button disabled={busy} onClick={handleRevert} title="Stage the inverse of this commit">
                  Revert
                </button>
                <button disabled={busy} onClick={handleCheckout} title="Check out this commit (detached HEAD)">
                  Checkout (detached)
                </button>

                {(detailMsg || detailErr) && (
                  <span
                    className={detailErr ? "commit-detail-err" : "commit-detail-ok"}
                    onClick={() => { setDetailMsg(null); setDetailErr(null); }}
                    title="Click to dismiss"
                  >
                    {detailErr ?? detailMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
