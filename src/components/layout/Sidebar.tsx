import { useEffect } from "react";
import { useBranchStore } from "../../store/branchStore";
import { useRepoStore } from "../../store/repoStore";
import { useGraphStore } from "../../store/graphStore";
import { useRepoWatcher } from "../../hooks/useRepoWatcher";
import type { BranchInfo } from "../../types";

export function Sidebar() {
  const { repoInfo } = useRepoStore();
  const { loadBranches, checkout, branches, error } = useBranchStore();
  const { loadGraph } = useGraphStore();
  const { refreshStatus } = useRepoStore();

  useEffect(() => {
    if (repoInfo) loadBranches();
  }, [repoInfo, loadBranches]);

  // Refresh branch list when .git changes (e.g. after a commit or external checkout).
  useRepoWatcher(() => {
    if (repoInfo) loadBranches();
  });

  const handleCheckout = async (branch: BranchInfo) => {
    if (branch.is_head || branch.is_remote) return;
    await checkout(branch.name);
    await refreshStatus();
    await loadGraph();
  };

  if (!repoInfo) return <div className="sidebar" />;

  const locals = branches.filter((b) => !b.is_remote);
  const remotes = branches.filter((b) => b.is_remote);

  return (
    <div className="sidebar">
      <BranchSection
        title="Local"
        branches={locals}
        onCheckout={handleCheckout}
      />
      {remotes.length > 0 && (
        <BranchSection
          title="Remote"
          branches={remotes}
          onCheckout={handleCheckout}
        />
      )}
      {error && <p className="sidebar-error">{error}</p>}
    </div>
  );
}

function BranchSection({
  title,
  branches,
  onCheckout,
}: {
  title: string;
  branches: BranchInfo[];
  onCheckout: (b: BranchInfo) => void;
}) {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-title">{title}</div>
      {branches.map((b) => (
        <BranchRow key={b.name} branch={b} onCheckout={onCheckout} />
      ))}
    </div>
  );
}

function BranchRow({
  branch,
  onCheckout,
}: {
  branch: BranchInfo;
  onCheckout: (b: BranchInfo) => void;
}) {
  const canCheckout = !branch.is_head && !branch.is_remote;

  return (
    <div
      className={`branch-row${branch.is_head ? " branch-head" : ""}${canCheckout ? " branch-clickable" : ""}`}
      onClick={() => canCheckout && onCheckout(branch)}
      title={branch.head_summary ?? undefined}
    >
      <span className="branch-icon">{branch.is_head ? "●" : "○"}</span>
      <span className="branch-name">{branch.name}</span>
      {(branch.ahead > 0 || branch.behind > 0) && (
        <span className="branch-sync">
          {branch.ahead > 0 && <span className="ahead">↑{branch.ahead}</span>}
          {branch.behind > 0 && <span className="behind">↓{branch.behind}</span>}
        </span>
      )}
      {branch.head_oid && (
        <span className="branch-oid">{branch.head_oid}</span>
      )}
    </div>
  );
}
