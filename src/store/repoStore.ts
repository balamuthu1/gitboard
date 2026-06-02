import { create } from "zustand";
import type { RepoInfo, StatusEntry } from "../types";
import * as api from "../api";

interface RepoStore {
  repoInfo: RepoInfo | null;
  status: StatusEntry[];
  selectedFile: string | null;
  selectedFileStaged: boolean;
  isLoading: boolean;
  error: string | null;

  openRepo: (path: string) => Promise<void>;
  discoverRepo: (path: string) => Promise<void>;
  closeRepo: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  selectFile: (path: string, staged: boolean) => void;
  clearError: () => void;
}

export const useRepoStore = create<RepoStore>((set, get) => ({
  repoInfo: null,
  status: [],
  selectedFile: null,
  selectedFileStaged: false,
  isLoading: false,
  error: null,

  openRepo: async (path) => {
    set({ isLoading: true, error: null });
    try {
      const repoInfo = await api.openRepo(path);
      set({ repoInfo, isLoading: false });
      await get().refreshStatus();
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  discoverRepo: async (path) => {
    set({ isLoading: true, error: null });
    try {
      const repoInfo = await api.discoverRepo(path);
      set({ repoInfo, isLoading: false });
      await get().refreshStatus();
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  closeRepo: async () => {
    await api.closeRepo();
    set({ repoInfo: null, status: [], selectedFile: null });
  },

  refreshStatus: async () => {
    if (!get().repoInfo) return;
    try {
      const status = await api.getStatus();
      set({ status });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  selectFile: (path, staged) => set({ selectedFile: path, selectedFileStaged: staged }),

  clearError: () => set({ error: null }),
}));
