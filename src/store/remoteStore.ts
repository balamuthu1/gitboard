import { create } from "zustand";
import * as api from "../api";

interface RemoteStore {
  isLoading: boolean;
  lastOutput: string | null;
  error: string | null;

  fetch: () => Promise<void>;
  pull: () => Promise<void>;
  push: (remote: string, branch: string, hasUpstream: boolean) => Promise<void>;
  clearError: () => void;
}

export const useRemoteStore = create<RemoteStore>((set) => ({
  isLoading: false,
  lastOutput: null,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const out = await api.fetchAll();
      set({ isLoading: false, lastOutput: out || "Already up to date." });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
    }
  },

  pull: async () => {
    set({ isLoading: true, error: null });
    try {
      const out = await api.pullBranch();
      set({ isLoading: false, lastOutput: out || "Already up to date." });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
    }
  },

  push: async (remote, branch, hasUpstream) => {
    set({ isLoading: true, error: null });
    try {
      const out = hasUpstream
        ? await api.pushBranch(remote, branch)
        : await api.pushSetUpstream(remote, branch);
      set({ isLoading: false, lastOutput: out || "Everything up-to-date." });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
    }
  },

  clearError: () => set({ error: null }),
}));
