import { create } from "zustand";
import type { BranchInfo } from "../types";
import {
  listBranches,
  checkoutBranch,
  checkoutCommit,
  createBranch,
  deleteBranch,
  mergeBranch,
  rebaseOnto,
} from "../api";

interface BranchStore {
  branches: BranchInfo[];
  isLoading: boolean;
  error: string | null;

  loadBranches: () => Promise<void>;
  checkout: (name: string) => Promise<void>;
  checkoutDetached: (oid: string) => Promise<void>;
  create: (name: string, from?: string) => Promise<void>;
  remove: (name: string) => Promise<void>;
  merge: (name: string) => Promise<string>;
  rebase: (onto: string) => Promise<string>;
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

  create: async (name, from) => {
    set({ error: null });
    try {
      await createBranch(name, from);
      await get().loadBranches();
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  remove: async (name) => {
    set({ error: null });
    try {
      await deleteBranch(name);
      await get().loadBranches();
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  merge: async (name) => {
    set({ error: null });
    try {
      const out = await mergeBranch(name);
      await get().loadBranches();
      return out;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  rebase: async (onto) => {
    set({ error: null });
    try {
      const out = await rebaseOnto(onto);
      await get().loadBranches();
      return out;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
