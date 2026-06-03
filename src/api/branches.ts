import { invoke } from "@tauri-apps/api/core";
import type { BranchInfo } from "../types";

export const listBranches = (): Promise<BranchInfo[]> => invoke("list_branches");

export const checkoutBranch = (name: string): Promise<void> =>
  invoke("checkout_branch", { name });

export const checkoutCommit = (oid: string): Promise<void> =>
  invoke("checkout_commit", { oid });

export const createBranch = (name: string, from?: string): Promise<void> =>
  invoke("create_branch", { name, from: from ?? null });

export const deleteBranch = (name: string): Promise<void> =>
  invoke("delete_branch", { name });

export const mergeBranch = (name: string): Promise<string> =>
  invoke("merge_branch", { name });

export const rebaseOnto = (onto: string): Promise<string> =>
  invoke("rebase_onto", { onto });
