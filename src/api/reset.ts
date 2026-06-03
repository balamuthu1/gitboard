import { invoke } from "@tauri-apps/api/core";

export const resetToCommit = (oid: string, mode: "soft" | "mixed" | "hard"): Promise<void> =>
  invoke("reset_to_commit", { oid, mode });

export const revertCommit = (oid: string): Promise<string> =>
  invoke("revert_commit", { oid });
