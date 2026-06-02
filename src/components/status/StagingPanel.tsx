import { useRepoStore } from "../../store/repoStore";
import { FileList } from "./FileList";

export function StagingPanel() {
  const { status, refreshStatus } = useRepoStore();

  const staged = status.filter((e) => e.index_status !== "unmodified");
  const unstaged = status.filter(
    (e) => e.workdir_status !== "unmodified" && e.workdir_status !== "untracked"
  );
  const untracked = status.filter((e) => e.workdir_status === "untracked");

  const refresh = () => refreshStatus();

  return (
    <div className="staging-panel">
      <FileList
        title={`Staged (${staged.length})`}
        entries={staged}
        kind="staged"
        onRefresh={refresh}
      />
      <FileList
        title={`Unstaged (${unstaged.length + untracked.length})`}
        entries={[...unstaged, ...untracked]}
        kind="unstaged"
        onRefresh={refresh}
      />
    </div>
  );
}
