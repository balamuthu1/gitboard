import { useRepoStore } from "../../store/repoStore";

export function StatusBar() {
  const { repoInfo, status } = useRepoStore();

  if (!repoInfo) return <div className="status-bar" />;

  const staged = status.filter((e) => e.index_status !== "unmodified").length;
  const unstaged = status.filter((e) => e.workdir_status !== "unmodified").length;

  return (
    <div className="status-bar">
      <span>{repoInfo.path}</span>
      {repoInfo.head_branch && <span className="branch">{repoInfo.head_branch}</span>}
      {repoInfo.head_oid && <span className="oid">{repoInfo.head_oid}</span>}
      {staged > 0 && <span className="staged">+{staged} staged</span>}
      {unstaged > 0 && <span className="unstaged">{unstaged} changed</span>}
    </div>
  );
}
