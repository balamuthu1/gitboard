import { useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useBranchStore } from "../../store/branchStore";
import { useRemoteStore } from "../../store/remoteStore";
import { useGraphStore } from "../../store/graphStore";
import { OpenRepoDialog } from "../repo/OpenRepoDialog";
import { CloneRepoDialog } from "../repo/CloneRepoDialog";

export function Toolbar() {
  const { repoInfo, closeRepo, refreshStatus } = useRepoStore();
  const { branches, loadBranches } = useBranchStore();
  const { fetch, pull, push, isLoading, error, lastOutput, clearError } = useRemoteStore();
  const { loadGraph } = useGraphStore();
  const [showOpen, setShowOpen] = useState(false);
  const [showClone, setShowClone] = useState(false);

  const headBranch = branches.find((b) => b.is_head);

  const afterRemote = async () => {
    await Promise.all([loadBranches(), loadGraph(), refreshStatus()]);
  };

  const handleFetch = async () => {
    await fetch();
    await afterRemote();
  };

  const handlePull = async () => {
    await pull();
    await afterRemote();
  };

  const handlePush = async () => {
    if (!headBranch || headBranch.name === "HEAD") return;
    const remote = headBranch.upstream?.split("/")[0] ?? "origin";
    await push(remote, headBranch.name, !!headBranch.upstream);
    await afterRemote();
  };

  return (
    <div className="toolbar">
      <span className="toolbar-brand">GitBoard</span>
      <div className="toolbar-actions">
        <button onClick={() => setShowOpen(true)}>Open Repo</button>
        <button onClick={() => setShowClone(true)}>Clone</button>
        {repoInfo && (
          <>
            <span className="toolbar-sep" />
            <button
              className="toolbar-remote-btn"
              onClick={handleFetch}
              disabled={isLoading}
              title="Fetch all remotes"
            >
              ↻ Fetch
            </button>
            <button
              className="toolbar-remote-btn"
              onClick={handlePull}
              disabled={isLoading}
              title="Pull current branch"
            >
              ↓ Pull
            </button>
            <button
              className="toolbar-remote-btn"
              onClick={handlePush}
              disabled={isLoading || !headBranch || headBranch.name === "HEAD"}
              title="Push current branch"
            >
              ↑ Push
            </button>
            <span className="toolbar-sep" />
            <span className="toolbar-path">{repoInfo.head_branch ?? "detached"}</span>
            <button onClick={closeRepo}>Close</button>
          </>
        )}
      </div>

      {(error || lastOutput) && (
        <div
          className={`toolbar-toast ${error ? "toolbar-toast-error" : "toolbar-toast-ok"}`}
          onClick={clearError}
        >
          {error ?? lastOutput}
        </div>
      )}

      {showOpen && <OpenRepoDialog onClose={() => setShowOpen(false)} />}
      {showClone && <CloneRepoDialog onClose={() => setShowClone(false)} />}
    </div>
  );
}
