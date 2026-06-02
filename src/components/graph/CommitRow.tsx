import type { CommitRow as CommitRowData } from "../../types";
import { RefBadge } from "./RefBadge";
import { ROW_HEIGHT } from "./GraphCanvas";

interface CommitRowProps {
  row: CommitRowData;
  index: number;
  canvasWidth: number;
  isSelected: boolean;
  onClick: () => void;
}

export function CommitRowItem({ row, index, isSelected, onClick }: Omit<CommitRowProps, "canvasWidth"> & { canvasWidth?: number }) {
  const date = new Date(row.timestamp * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={`commit-row-item${isSelected ? " selected" : ""}`}
      style={{ top: index * ROW_HEIGHT, left: 0, height: ROW_HEIGHT }}
      onClick={onClick}
    >
      <span className="commit-summary">{row.summary}</span>
      <span className="commit-refs">
        {row.refs.map((r) => (
          <RefBadge key={r.name} ref={r} />
        ))}
      </span>
      <span className="commit-author">{row.author_name}</span>
      <span className="commit-date">{date}</span>
      <span className="commit-oid">{row.short_oid}</span>
    </div>
  );
}
