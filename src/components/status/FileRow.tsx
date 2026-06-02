import type { FileStatus, StatusEntry } from "../../types";
import { useRepoStore } from "../../store/repoStore";
import * as api from "../../api";

const STATUS_LABELS: Record<FileStatus, string> = {
  unmodified: " ",
  added: "A",
  modified: "M",
  deleted: "D",
  renamed: "R",
  copied: "C",
  untracked: "?",
  ignored: "!",
  conflicted: "U",
};

interface FileRowProps {
  entry: StatusEntry;
  kind: "staged" | "unstaged";
  onRefresh: () => void;
}

export function FileRow({ entry, kind, onRefresh }: FileRowProps) {
  const { selectFile } = useRepoStore();
  const staged = kind === "staged";
  const displayStatus = staged ? entry.index_status : entry.workdir_status;

  const handleStage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (staged) {
      await api.unstagePath(entry.path);
    } else {
      await api.stagePath(entry.path);
    }
    onRefresh();
  };

  const handleDiscard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await api.discardChanges(entry.path);
    onRefresh();
  };

  return (
    <div className="file-row" onClick={() => selectFile(entry.path, staged)}>
      <span className={`file-status status-${displayStatus}`}>
        {STATUS_LABELS[displayStatus]}
      </span>
      <span className="file-path">{entry.path}</span>
      <div className="file-actions">
        <button onClick={handleStage} title={staged ? "Unstage" : "Stage"}>
          {staged ? "−" : "+"}
        </button>
        {!staged && (
          <button onClick={handleDiscard} title="Discard changes">↩</button>
        )}
      </div>
    </div>
  );
}
