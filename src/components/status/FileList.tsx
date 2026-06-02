import type { StatusEntry } from "../../types";
import { FileRow } from "./FileRow";
import * as api from "../../api";

interface FileListProps {
  title: string;
  entries: StatusEntry[];
  kind: "staged" | "unstaged";
  onRefresh: () => void;
}

export function FileList({ title, entries, kind, onRefresh }: FileListProps) {
  const handleStageAll = async () => {
    await api.stageAll();
    onRefresh();
  };

  return (
    <div className="file-list">
      <div className="file-list-header">
        <span>{title}</span>
        {kind === "unstaged" && entries.length > 0 && (
          <button onClick={handleStageAll} title="Stage all">Stage all</button>
        )}
      </div>
      <div className="file-list-body">
        {entries.length === 0 ? (
          <p className="empty">No files</p>
        ) : (
          entries.map((entry) => (
            <FileRow key={entry.path} entry={entry} kind={kind} onRefresh={onRefresh} />
          ))
        )}
      </div>
    </div>
  );
}
