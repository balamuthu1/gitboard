import { Toolbar } from "./components/layout/Toolbar";
import { TabBar } from "./components/layout/TabBar";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { CommitGraph } from "./components/graph/CommitGraph";
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
      <TabBar />
      <div className="app-body">
        {/* Branch sidebar */}
        {repoInfo && <Sidebar />}

        {/* Centre: commit graph (with built-in detail panel) */}
        <div className="pane pane-graph">
          <CommitGraph />
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
