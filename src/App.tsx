import { Toolbar } from "./components/layout/Toolbar";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { CommitGraph } from "./components/graph/CommitGraph";
import { CommitActions } from "./components/graph/CommitActions";
import { StagingPanel } from "./components/status/StagingPanel";
import { DiffViewer } from "./components/diff/DiffViewer";
import { CommitForm } from "./components/commit/CommitForm";
import { useRepoStore } from "./store/repoStore";
import "./App.css";

function App() {
  const { repoInfo } = useRepoStore();

  return (
    <div className="app">
      <Toolbar />
      <div className="app-body">
        {/* Branch sidebar */}
        {repoInfo && <Sidebar />}

        {/* Centre: commit graph + commit actions bar */}
        <div className="pane pane-graph">
          <CommitGraph />
          {repoInfo && <CommitActions />}
        </div>

        {/* Right: staging + diff + commit */}
        {repoInfo && (
          <div className="pane pane-right">
            <StagingPanel />
            <DiffViewer />
            <CommitForm />
          </div>
        )}
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
