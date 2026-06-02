import { create } from "zustand";
import type { CommitRow, GraphPayload } from "../types";
import * as api from "../api";

interface GraphStore {
  rows: CommitRow[];
  total: number;
  selectedOid: string | null;
  isLoading: boolean;
  error: string | null;

  loadGraph: (maxCount?: number) => Promise<void>;
  selectCommit: (oid: string | null) => void;
  clearError: () => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  rows: [],
  total: 0,
  selectedOid: null,
  isLoading: false,
  error: null,

  loadGraph: async (maxCount) => {
    set({ isLoading: true, error: null });
    try {
      const payload: GraphPayload = await api.getGraph(maxCount);
      set({ rows: payload.rows, total: payload.total, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  selectCommit: (oid) => set({ selectedOid: oid }),

  clearError: () => set({ error: null }),
}));
