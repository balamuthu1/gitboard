import { invoke } from "@tauri-apps/api/core";
import type { DiffResult } from "../types";

export const diffFile = (path: string, staged: boolean): Promise<DiffResult> =>
  invoke("diff_file", { path, staged });
