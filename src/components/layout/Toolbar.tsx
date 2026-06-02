import { useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { OpenRepoDialog } from "../repo/OpenRepoDialog";
import { CloneRepoDialog } from "../repo/CloneRepoDialog";

export function Toolbar() {
  const { repoInfo, closeRepo } = useRepoStore();
  const [showOpen, setShowOpen] = useState(false);
  const [showClone, setShowClone] = useState(false);

  return (
    <div className="toolbar">
      <span className="toolbar-brand">GitBoard</span>
      <div className="toolbar-actions">
        <button onClick={() => setShowOpen(true)}>Open Repo</button>
        <button onClick={() => setShowClone(true)}>Clone</button>
        {repoInfo && (
          <>
            <span className="toolbar-path">{repoInfo.head_branch ?? "detached"}</span>
            <button onClick={closeRepo}>Close</button>
          </>
        )}
      </div>
      {showOpen && <OpenRepoDialog onClose={() => setShowOpen(false)} />}
      {showClone && <CloneRepoDialog onClose={() => setShowClone(false)} />}
    </div>
  );
}
