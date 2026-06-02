import type { RefLabel } from "../../types";

const KIND_COLORS: Record<string, string> = {
  local_branch: "#3b82f6",
  remote_branch: "#f97316",
  tag: "#a855f7",
  head: "#22c55e",
};

export function RefBadge({ ref: r }: { ref: RefLabel }) {
  return (
    <span
      className="ref-badge"
      style={{ backgroundColor: KIND_COLORS[r.kind] ?? "#6b7280" }}
      title={r.kind}
    >
      {r.is_head && "→ "}
      {r.name}
    </span>
  );
}
