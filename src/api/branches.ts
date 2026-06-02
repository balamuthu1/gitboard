import { invoke } from "@tauri-apps/api/core";
import type { BranchInfo } from "../types";

export const listBranches = (): Promise<BranchInfo[]> => invoke("list_branches");

export const checkoutBranch = (name: string): Promise<void> =>
  invoke("checkout_branch", { name });

export const checkoutCommit = (oid: string): Promise<void> =>
  invoke("checkout_commit", { oid });
