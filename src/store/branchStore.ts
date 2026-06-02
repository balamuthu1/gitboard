import { create } from "zustand";
import type { BranchInfo } from "../types";
import { listBranches, checkoutBranch, checkoutCommit } from "../api";

interface BranchStore {
  branches: BranchInfo[];
  isLoading: boolean;
  error: string | null;

  loadBranches: () => Promise<void>;
  checkout: (name: string) => Promise<void>;
  checkoutDetached: (oid: string) => Promise<void>;
  clearError: () => void;
}

export const useBranchStore = create<BranchStore>((set, get) => ({
  branches: [],
  isLoading: false,
  error: null,

  loadBranches: async () => {
    set({ isLoading: true, error: null });
    try {
      const branches = await listBranches();
      set({ branches, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  checkout: async (name) => {
    set({ error: null });
    try {
      await checkoutBranch(name);
      await get().loadBranches();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  checkoutDetached: async (oid) => {
    set({ error: null });
    try {
      await checkoutCommit(oid);
      await get().loadBranches();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  clearError: () => set({ error: null }),
}));
