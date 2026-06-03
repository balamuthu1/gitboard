import { useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { useBranchStore } from "../../store/branchStore";
import { useRemoteStore } from "../../store/remoteStore";
import { useGraphStore } from "../../store/graphStore";
import { useTabsStore } from "../../store/tabsStore";
import { OpenRepoDialog } from "../repo/OpenRepoDialog";
import { CloneRepoDialog } from "../repo/CloneRepoDialog";

interface TbBtnProps {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}

function TbBtn({ icon, label, onClick, disabled, title }: TbBtnProps) {
  return (
    <button className="tb-btn" onClick={onClick} disabled={disabled} title={title}>
      <span className="tb-btn-icon">{icon}</span>
      <span className="tb-btn-label">{label}</span>
    </button>
  );
}

export function Toolbar() {
  const { repoInfo, refreshStatus } = useRepoStore();
  const { tabs, activeId, closeTab } = useTabsStore();
  const { branches, loadBranches } = useBranchStore();
  const { fetch, pull, push, isLoading, error, lastOutput, clearError } = useRemoteStore();
  const { loadGraph } = useGraphStore();
  const [showOpen, setShowOpen] = useState(false);
  const [showClone, setShowClone] = useState(false);

  const headBranch = branches.find((b) => b.is_head);
  const activeTab = tabs.find((t) => t.id === activeId);
  const repoName = activeTab?.name ?? repoInfo?.path.split(/[\\/]/).pop() ?? null;
  const branchName = headBranch?.name ?? repoInfo?.head_branch ?? "detached";

  const afterRemote = async () => {
    await Promise.all([loadBranches(), loadGraph(), refreshStatus()]);
  };

  const hasRepo = !!repoInfo;
  const canPush = hasRepo && !isLoading && !!headBranch && headBranch.name !== "HEAD";

  return (
    <div className="toolbar">
      {/* ── Left: brand + repo › branch breadcrumb ── */}
      <div className="toolbar-left">
        <span className="toolbar-brand">GitBoard</span>

        {repoName && (
          <>
            <span className="toolbar-crumb-sep">›</span>
            <span className="toolbar-crumb toolbar-crumb-repo" title={repoInfo?.path}>
              <span className="toolbar-crumb-icon">⊞</span>
              <span className="toolbar-crumb-text">{repoName}</span>
            </span>
          </>
        )}

        {hasRepo && (
          <>
            <span className="toolbar-crumb-sep">›</span>
            <span className="toolbar-crumb toolbar-crumb-branch">
              <span className="toolbar-crumb-icon">⎇</span>
              <span className="toolbar-crumb-text">{branchName}</span>
            </span>
          </>
        )}
      </div>

      {/* ── Center: action buttons (icon + label stacked) ── */}
      <div className="toolbar-center">
        <TbBtn icon="↩" label="Undo" disabled title="Undo (not yet implemented)" />
        <TbBtn icon="↪" label="Redo" disabled title="Redo (not yet implemented)" />

        <div className="tb-sep" />

        <TbBtn
          icon="↻"
          label="Fetch"
          onClick={async () => { await fetch(); await afterRemote(); }}
          disabled={!hasRepo || isLoading}
          title="Fetch all remotes"
        />
        <TbBtn
          icon="↓"
          label="Pull"
          onClick={async () => { await pull(); await afterRemote(); }}
          disabled={!hasRepo || isLoading}
          title="Pull current branch"
        />
        <TbBtn
          icon="↑"
          label="Push"
          onClick={async () => {
            if (!headBranch || headBranch.name === "HEAD") return;
            const remote = headBranch.upstream?.split("/")[0] ?? "origin";
            await push(remote, headBranch.name, !!headBranch.upstream);
            await afterRemote();
          }}
          disabled={!canPush}
          title="Push current branch"
        />

        <div className="tb-sep" />

        <TbBtn icon="⎇" label="Branch" disabled={!hasRepo} title="Create branch (use sidebar)" />
        <TbBtn icon="⤓" label="Stash"  disabled title="Stash (not yet implemented)" />
        <TbBtn icon="⤒" label="Pop"    disabled title="Pop stash (not yet implemented)" />

        <div className="tb-sep" />

        <TbBtn icon=">_" label="Terminal" disabled title="Terminal (not yet implemented)" />
      </div>

      {/* ── Right: open / clone / close ── */}
      <div className="toolbar-right">
        <button className="tb-icon-btn" onClick={() => setShowOpen(true)} title="Open repository">
          📂
        </button>
        <button className="tb-icon-btn" onClick={() => setShowClone(true)} title="Clone repository">
          ⎘
        </button>
        {hasRepo && (
          <button
            className="tb-icon-btn tb-icon-btn-close"
            onClick={() => activeId && closeTab(activeId)}
            title="Close repository"
          >
            ✕
          </button>
        )}
      </div>

      {/* Toast feedback */}
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
