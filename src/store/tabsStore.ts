import { create } from "zustand";
import { useRepoStore } from "./repoStore";
import { useGraphStore } from "./graphStore";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export interface RepoTab {
  id: string;
  path: string;
  name: string;
}

interface TabsStore {
  tabs: RepoTab[];
  activeId: string | null;
  addTab: (path: string) => Promise<void>;
  closeTab: (id: string) => Promise<void>;
  switchTab: (id: string) => Promise<void>;
}

export const useTabsStore = create<TabsStore>((set, get) => ({
  tabs: [],
  activeId: null,

  addTab: async (path: string) => {
    const existing = get().tabs.find((t) => t.path === path);
    if (existing) {
      if (existing.id !== get().activeId) await get().switchTab(existing.id);
      return;
    }
    const name = path.split(/[\\/]/).pop() ?? path;
    const id = genId();
    set((s) => ({ tabs: [...s.tabs, { id, path, name }], activeId: id }));
    useGraphStore.getState().selectCommit(null);
    await useRepoStore.getState().openRepo(path);
  },

  closeTab: async (id: string) => {
    const { tabs, activeId } = get();
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const newTabs = tabs.filter((t) => t.id !== id);
    if (activeId !== id) { set({ tabs: newTabs }); return; }
    if (newTabs.length === 0) {
      set({ tabs: [], activeId: null });
      useGraphStore.getState().selectCommit(null);
      await useRepoStore.getState().closeRepo();
    } else {
      const next = newTabs[Math.min(idx, newTabs.length - 1)];
      set({ tabs: newTabs, activeId: next.id });
      useGraphStore.getState().selectCommit(null);
      await useRepoStore.getState().openRepo(next.path);
    }
  },

  switchTab: async (id: string) => {
    const { tabs, activeId } = get();
    if (id === activeId) return;
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    set({ activeId: id });
    useGraphStore.getState().selectCommit(null);
    await useRepoStore.getState().openRepo(tab.path);
  },
}));
