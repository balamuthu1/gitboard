import { invoke } from "@tauri-apps/api/core";

export const fetchAll = (): Promise<string> => invoke("fetch_all");
export const pullBranch = (): Promise<string> => invoke("pull_branch");
export const pushBranch = (remote: string, branch: string, force = false): Promise<string> =>
  invoke("push_branch", { remote, branch, force });
export const pushSetUpstream = (remote: string, branch: string): Promise<string> =>
  invoke("push_set_upstream", { remote, branch });
