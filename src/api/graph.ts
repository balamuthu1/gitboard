import { invoke } from "@tauri-apps/api/core";
import type { GraphPayload } from "../types";

export const getGraph = (maxCount?: number): Promise<GraphPayload> =>
  invoke("get_graph", { max_count: maxCount ?? null });
