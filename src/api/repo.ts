import { invoke } from "@tauri-apps/api/core";
import type { RepoInfo } from "../types";

export const openRepo = (path: string): Promise<RepoInfo> =>
  invoke("open_repo", { path });

export const discoverRepo = (path: string): Promise<RepoInfo> =>
  invoke("discover_repo", { path });

export const cloneRepo = (remoteUrl: string, localPath: string): Promise<RepoInfo> =>
  invoke("clone_repo", { remote_url: remoteUrl, local_path: localPath });

export const closeRepo = (): Promise<void> => invoke("close_repo");
