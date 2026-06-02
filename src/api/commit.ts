import { invoke } from "@tauri-apps/api/core";
import type { CommitSummary } from "../types";

export const createCommit = (message: string): Promise<CommitSummary> =>
  invoke("create_commit", { message });

export const amendCommit = (message?: string): Promise<CommitSummary> =>
  invoke("amend_commit", { message: message ?? null });
