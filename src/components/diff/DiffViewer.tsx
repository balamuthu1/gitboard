import { useEffect, useState } from "react";
import { useRepoStore } from "../../store/repoStore";
import { diffFile } from "../../api";
import type { DiffResult } from "../../types";
import { HunkBlock } from "./HunkBlock";

export function DiffViewer() {
  const { selectedFile, selectedFileStaged } = useRepoStore();
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setDiff(null);
      return;
    }
    setError(null);
    diffFile(selectedFile, selectedFileStaged)
      .then(setDiff)
      .catch((e) => setError(String(e)));
  }, [selectedFile, selectedFileStaged]);

  if (!selectedFile) {
    return <div className="diff-viewer empty">Select a file to view diff</div>;
  }
  if (error) {
    return <div className="diff-viewer error">{error}</div>;
  }
  if (!diff) {
    return <div className="diff-viewer loading">Loading…</div>;
  }
  if (diff.is_binary) {
    return <div className="diff-viewer binary">Binary file</div>;
  }
  if (diff.hunks.length === 0) {
    return <div className="diff-viewer empty">No changes</div>;
  }

  return (
    <div className="diff-viewer">
      <div className="diff-header">{diff.path}</div>
      {diff.hunks.map((hunk, i) => (
        <HunkBlock key={i} hunk={hunk} />
      ))}
    </div>
  );
}
