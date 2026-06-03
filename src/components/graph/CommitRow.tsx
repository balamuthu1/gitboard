import type { CommitRow as CommitRowData } from "../../types";
import { RefBadge } from "./RefBadge";
import { ROW_HEIGHT } from "./GraphCanvas";

export interface ColWidths {
  branchTag: number;
  graph: number;
  date: number;
  author: number;
  oid: number;
}

interface CommitRowProps {
  row: CommitRowData;
  isSelected: boolean;
  onClick: () => void;
  colWidths: ColWidths;
}

export function CommitRowItem({ row, isSelected, onClick, colWidths: cw }: CommitRowProps) {
  const date = new Date(row.timestamp * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={`commit-row-item${isSelected ? " selected" : ""}`}
      style={{
        display: "grid",
        gridTemplateColumns: `${cw.branchTag}px ${cw.graph}px 1fr ${cw.date}px ${cw.author}px ${cw.oid}px`,
        height: ROW_HEIGHT,
      }}
      onClick={onClick}
    >
      <div className="col-branch-tag">
        {row.refs.map((r) => (
          <RefBadge key={r.name} ref={r} />
        ))}
      </div>
      <div className="col-graph" />
      <div className="col-message">
        <span className="commit-summary">{row.summary}</span>
      </div>
      <div className="col-date">{date}</div>
      <div className="col-author">{row.author_name}</div>
      <div className="col-oid">{row.short_oid}</div>
    </div>
  );
}
