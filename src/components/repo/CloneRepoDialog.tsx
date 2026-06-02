import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useRepoStore } from "../../store/repoStore";
import * as api from "../../api";

export function CloneRepoDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [dest, setDest] = useState("");
  const [progress, setProgress] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { openRepo } = useRepoStore();

  const handleBrowse = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") setDest(selected);
  };

  const handleClone = async () => {
    if (!url || !dest) return;
    setIsCloning(true);
    setError(null);
    setProgress("Cloning…");
    try {
      await api.cloneRepo(url, dest);
      await openRepo(dest);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setIsCloning(false);
      setProgress("");
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h2>Clone Repository</h2>
        <div className="dialog-row">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
          />
        </div>
        <div className="dialog-row">
          <input
            type="text"
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            placeholder="/path/to/destination"
          />
          <button onClick={handleBrowse}>Browse…</button>
        </div>
        {progress && <p className="progress">{progress}</p>}
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          <button onClick={onClose} disabled={isCloning}>Cancel</button>
          <button onClick={handleClone} disabled={!url || !dest || isCloning}>
            {isCloning ? "Cloning…" : "Clone"}
          </button>
        </div>
      </div>
    </div>
  );
}
