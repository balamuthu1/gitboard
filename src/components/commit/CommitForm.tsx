import { useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useGraphStore } from "../../store/graphStore";
import { createCommit, amendCommit } from "../../api";

export function CommitForm() {
  const [message, setMessage] = useState("");
  const [amend, setAmend] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshStatus, status } = useRepoStore();
  const { loadGraph } = useGraphStore();

  const stagedCount = status.filter((e) => e.index_status !== "unmodified").length;

  const handleCommit = async () => {
    if (!message.trim() && !amend) return;
    setIsCommitting(true);
    setError(null);
    try {
      if (amend) {
        await amendCommit(message || undefined);
      } else {
        await createCommit(message);
      }
      setMessage("");
      setAmend(false);
      await refreshStatus();
      await loadGraph();
    } catch (e) {
      setError(String(e));
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="commit-form">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Commit message (first line is summary)…"
        rows={4}
      />
      {error && <p className="error">{error}</p>}
      <div className="commit-form-footer">
        <label>
          <input type="checkbox" checked={amend} onChange={(e) => setAmend(e.target.checked)} />
          Amend last commit
        </label>
        <button
          onClick={handleCommit}
          disabled={(!message.trim() && !amend) || stagedCount === 0 || isCommitting}
        >
          {isCommitting ? "Committing…" : amend ? "Amend" : `Commit (${stagedCount})`}
        </button>
      </div>
    </div>
  );
}
