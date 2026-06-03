import { useState } from "react";
import { useGraphStore } from "../../store/graphStore";
import { useRepoStore } from "../../store/repoStore";
import * as api from "../../api";

export function CommitActions() {
  const { selectedOid, rows, loadGraph, selectCommit } = useGraphStore();
  const { refreshStatus } = useRepoStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!selectedOid) return null;

  const row = rows.find((r) => r.oid === selectedOid);
  const label = row?.summary ? `"${row.summary.slice(0, 48)}"` : selectedOid.slice(0, 7);

  const afterOp = async () => {
    setBusy(false);
    await Promise.all([loadGraph(), refreshStatus()]);
    selectCommit(null);
  };

  const handleReset = async (mode: "soft" | "mixed" | "hard") => {
    if (mode === "hard" && !confirm(`Hard reset to ${label}? This discards all uncommitted changes.`))
      return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await api.resetToCommit(selectedOid, mode);
      setMsg(`Reset (${mode}) to ${selectedOid.slice(0, 7)}`);
      await afterOp();
    } catch (e) {
      setErr(String(e));
      setBusy(false);
    }
  };

  const handleRevert = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await api.revertCommit(selectedOid);
      setMsg(`Reverted ${selectedOid.slice(0, 7)} — changes staged, commit to finish`);
      await afterOp();
    } catch (e) {
      setErr(String(e));
      setBusy(false);
    }
  };

  return (
    <div className="commit-actions-bar">
      <span className="commit-actions-label">
        {selectedOid.slice(0, 7)}
      </span>

      <div className="commit-actions-group">
        <span className="commit-actions-group-label">Reset HEAD to here:</span>
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
          Hard
        </button>
      </div>

      <button disabled={busy} onClick={handleRevert} title="Stage the inverse of this commit">
        Revert
      </button>

      {(msg || err) && (
        <span
          className={err ? "commit-actions-err" : "commit-actions-ok"}
          onClick={() => { setMsg(null); setErr(null); }}
        >
          {err ?? msg}
        </span>
      )}
    </div>
  );
}
