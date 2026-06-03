import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useTabsStore } from "../../store/tabsStore";

export function OpenRepoDialog({ onClose }: { onClose: () => void }) {
  const [path, setPath] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addTab } = useTabsStore();

  const handleBrowse = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") setPath(selected);
  };

  const handleOpen = async () => {
    if (!path) return;
    setIsLoading(true);
    setError(null);
    try {
      await addTab(path);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h2>Open Repository</h2>
        <div className="dialog-row">
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/path/to/repo"
          />
          <button onClick={handleBrowse}>Browse…</button>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleOpen} disabled={!path || isLoading}>
            {isLoading ? "Opening…" : "Open"}
          </button>
        </div>
      </div>
    </div>
  );
}
