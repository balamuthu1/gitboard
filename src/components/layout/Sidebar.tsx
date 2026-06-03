import { useEffect, useState } from "react";
import { useBranchStore } from "../../store/branchStore";
import { useRepoStore } from "../../store/repoStore";
import { useGraphStore } from "../../store/graphStore";
import { useRepoWatcher } from "../../hooks/useRepoWatcher";
import type { BranchInfo } from "../../types";

export function Sidebar() {
  const { repoInfo } = useRepoStore();
  const { loadBranches, checkout, create, remove, merge, rebase, branches, error } =
    useBranchStore();
  const { loadGraph } = useGraphStore();
  const { refreshStatus } = useRepoStore();
  const [creating, setCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  useEffect(() => {
    if (repoInfo) loadBranches();
  }, [repoInfo, loadBranches]);

  useRepoWatcher(() => {
    if (repoInfo) loadBranches();
  });

  const afterOp = async () => {
    await Promise.all([loadBranches(), loadGraph(), refreshStatus()]);
  };

  const handleCheckout = async (branch: BranchInfo) => {
    if (branch.is_head || branch.is_remote) return;
    await checkout(branch.name);
    await afterOp();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBranchName.trim();
    if (!name) return;
    try {
      await create(name);
      setNewBranchName("");
      setCreating(false);
    } catch {
      // error shown via branchStore.error
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete branch "${name}"?`)) return;
    await remove(name);
  };

  const handleMerge = async (name: string) => {
    await merge(name);
    await afterOp();
  };

  const handleRebase = async (onto: string) => {
    await rebase(onto);
    await afterOp();
  };

  if (!repoInfo) return <div className="sidebar" />;

  const locals = branches.filter((b) => !b.is_remote);
  const remotes = branches.filter((b) => b.is_remote);

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-section-title">
          <span>Local</span>
          <button
            className="sidebar-new-btn"
            onClick={() => setCreating((v) => !v)}
            title="New branch"
          >
            +
          </button>
        </div>

        {creating && (
          <form className="branch-create-form" onSubmit={handleCreate}>
            <input
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="branch-name"
              autoFocus
            />
            <button type="submit" disabled={!newBranchName.trim()}>
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewBranchName("");
              }}
            >
              ✕
            </button>
          </form>
        )}

        {locals.map((b) => (
          <BranchRow
            key={b.name}
            branch={b}
            onCheckout={handleCheckout}
            onDelete={handleDelete}
            onMerge={handleMerge}
            onRebase={handleRebase}
          />
        ))}
      </div>

      {remotes.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Remote</div>
          {remotes.map((b) => (
            <BranchRow
              key={b.name}
              branch={b}
              onCheckout={handleCheckout}
              onDelete={handleDelete}
              onMerge={handleMerge}
              onRebase={handleRebase}
            />
          ))}
        </div>
      )}

      {error && <p className="sidebar-error">{error}</p>}
    </div>
  );
}

function BranchRow({
  branch,
  onCheckout,
  onDelete,
  onMerge,
  onRebase,
}: {
  branch: BranchInfo;
  onCheckout: (b: BranchInfo) => void;
  onDelete: (name: string) => void;
  onMerge: (name: string) => void;
  onRebase: (onto: string) => void;
}) {
  const canCheckout = !branch.is_head && !branch.is_remote;
  const canDelete = !branch.is_head && !branch.is_remote;
  const canMergeOrRebase = !branch.is_head;

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
      <span className="branch-actions">
        {canMergeOrRebase && (
          <>
            <button
              className="branch-action-btn"
              title={`Merge ${branch.name} into HEAD`}
              onClick={(e) => { e.stopPropagation(); onMerge(branch.name); }}
            >
              ⤵
            </button>
            <button
              className="branch-action-btn"
              title={`Rebase HEAD onto ${branch.name}`}
              onClick={(e) => { e.stopPropagation(); onRebase(branch.name); }}
            >
              ↕
            </button>
          </>
        )}
        {canDelete && (
          <button
            className="branch-action-btn branch-delete-btn"
            title={`Delete ${branch.name}`}
            onClick={(e) => { e.stopPropagation(); onDelete(branch.name); }}
          >
            ✕
          </button>
        )}
      </span>
    </div>
  );
}
