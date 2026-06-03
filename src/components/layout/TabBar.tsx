import { useState } from "react";
import { useTabsStore } from "../../store/tabsStore";
import { OpenRepoDialog } from "../repo/OpenRepoDialog";

export function TabBar() {
  const { tabs, activeId, switchTab, closeTab } = useTabsStore();
  const [showOpen, setShowOpen] = useState(false);

  if (tabs.length === 0 && !showOpen) return null;

  return (
    <>
      <div className="tab-bar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab${tab.id === activeId ? " tab-active" : ""}`}
            onClick={() => switchTab(tab.id)}
          >
            <span className="tab-icon">⎇</span>
            <span className="tab-name">{tab.name}</span>
            <button
              className="tab-close"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              title="Close tab"
            >
              ×
            </button>
          </div>
        ))}
        <button className="tab-add" onClick={() => setShowOpen(true)} title="Open repository">
          +
        </button>
      </div>
      {showOpen && <OpenRepoDialog onClose={() => setShowOpen(false)} />}
    </>
  );
}
