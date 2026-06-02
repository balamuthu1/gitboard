import { invoke } from "@tauri-apps/api/core";
import type { StatusEntry } from "../types";

export const getStatus = (): Promise<StatusEntry[]> => invoke("get_status");

export const stagePath = (path: string): Promise<void> =>
  invoke("stage_path", { path });

export const unstagePath = (path: string): Promise<void> =>
  invoke("unstage_path", { path });

export const stageAll = (): Promise<void> => invoke("stage_all");

export const discardChanges = (path: string): Promise<void> =>
  invoke("discard_changes", { path });
