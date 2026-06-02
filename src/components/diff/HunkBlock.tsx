import type { DiffHunk } from "../../types";

export function HunkBlock({ hunk }: { hunk: DiffHunk }) {
  return (
    <div className="hunk">
      <div className="hunk-header">{hunk.header}</div>
      <div className="hunk-lines">
        {hunk.lines.map((line, i) => (
          <div key={i} className={`diff-line diff-${line.kind}`}>
            <span className="lineno old">{line.old_lineno ?? ""}</span>
            <span className="lineno new">{line.new_lineno ?? ""}</span>
            <span className="diff-prefix">
              {line.kind === "add" ? "+" : line.kind === "remove" ? "−" : " "}
            </span>
            <span className="diff-content">{line.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
