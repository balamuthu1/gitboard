// Mirrors Rust types from src-tauri/src/types.rs exactly (snake_case JSON keys).

export interface RepoInfo {
  path: string;
  head_branch: string | null;
  head_oid: string | null;
  is_bare: boolean;
}

export interface BranchInfo {
  name: string;
  is_head: boolean;
  is_remote: boolean;
  upstream: string | null;
  ahead: number;
  behind: number;
  head_oid: string | null;
  head_summary: string | null;
}

export type FileStatus =
  | "unmodified"
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "untracked"
  | "ignored"
  | "conflicted";

export interface StatusEntry {
  path: string;
  old_path: string | null;
  index_status: FileStatus;
  workdir_status: FileStatus;
}

export type DiffLineKind = "add" | "remove" | "context";

export interface DiffLine {
  kind: DiffLineKind;
  old_lineno: number | null;
  new_lineno: number | null;
  content: string;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffResult {
  path: string;
  hunks: DiffHunk[];
  is_binary: boolean;
}

export interface Signature {
  name: string;
  email: string;
}

export interface CommitSummary {
  oid: string;
  short_oid: string;
  message: string;
  author: Signature;
  timestamp: number;
}

export type RefKind = "local_branch" | "remote_branch" | "tag" | "head";

export interface RefLabel {
  name: string;
  kind: RefKind;
  is_head: boolean;
}

export type EdgeKind = "straight" | "merge" | "fork";

export interface Edge {
  from_lane: number;
  to_lane: number;
  color_index: number;
  kind: EdgeKind;
}

export interface CommitRow {
  oid: string;
  short_oid: string;
  summary: string;
  author_name: string;
  author_email: string;
  timestamp: number;
  refs: RefLabel[];
  parents: string[];
  lane: number;
  lane_color: number;
  edges: Edge[];
}

export interface GraphPayload {
  rows: CommitRow[];
  total: number;
}
