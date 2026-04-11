import { useState, useEffect, useCallback } from "react";
import type { RedisConnection } from "./types";
import * as api from "./api/redis";
import { Sidebar } from "./components/Sidebar";
import { KeyTree } from "./components/KeyTree";
import { KeyDetailPanel } from "./components/KeyDetailPanel";
import { TerminalPanel } from "./components/TerminalPanel";
import { AddKeyModal } from "./components/AddKeyModal";
import { AboutDialog } from "./components/AboutDialog";
import { UpdateDialog } from "./components/UpdateDialog";
import { StatusBar } from "./components/StatusBar";
import { ResizeHandle } from "./components/ResizeHandle";
import { Plus } from "lucide-react";
import { useI18n } from "./i18n";

const SIDEBAR_COLLAPSED_KEY = "interedy-sidebar-collapsed";

function AppContent() {
  const { t } = useI18n();
  const [connections, setConnections] = useState<RedisConnection[]>([]);
  const [activeConnId, setActiveConnId] = useState<string | null>(null);
  const [currentDB, setCurrentDB] = useState<number>(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showAddKey, setShowAddKey] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [keyRefresh, setKeyRefresh] = useState(0);
  const [keyTreeWidth, setKeyTreeWidth] = useState(288); // w-72 = 288px
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const sidebarWidth = sidebarCollapsed ? 48 : 220;
  const mainMinWidth = 320;

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for show-about event from macOS menu
  useEffect(() => {
    if ("__TAURI_INTERNALS__" in window) {
      let unlisten: (() => void) | undefined;
      import("@tauri-apps/api/event").then((module) => {
        module.listen("show-about", () => {
          setShowAbout(true);
        }).then((fn) => { unlisten = fn; });
      });
      return () => { unlisten?.(); };
    }
  }, []);

  // Listen for check-for-updates event from macOS menu
  useEffect(() => {
    if ("__TAURI_INTERNALS__" in window) {
      let unlisten: (() => void) | undefined;
      import("@tauri-apps/api/event").then((module) => {
        module.listen("check-for-updates", () => {
          setShowUpdate(true);
        }).then((fn) => { unlisten = fn; });
      });
      return () => { unlisten?.(); };
    }
  }, []);

  const keyTreeMaxWidth = Math.max(200, windowWidth - sidebarWidth - mainMinWidth);

  const refreshConnections = useCallback(async () => {
    const conns = await api.listConnections();
    setConnections(conns);
  }, []);

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  const activeConn = connections.find((c) => c.id === activeConnId);

  const handleSelectConnection = (id: string) => {
    setActiveConnId(id || null);
    setSelectedKey(null);
    if (id) {
      const conn = connections.find((c) => c.id === id);
      setCurrentDB(conn?.db ?? 0);
    } else {
      setCurrentDB(0);
    }
  };

  const handleSwitchDB = async (db: number) => {
    if (!activeConnId) return;
    try {
      const newDB = await api.switchDB(activeConnId, db);
      setCurrentDB(newDB);
      setSelectedKey(null);
    } catch (e) {
      console.error("Switch DB failed:", e);
    }
  };

  return (
    <>
      {/* Top: main workspace row */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar: Connection List */}
        <Sidebar
          connections={connections}
          activeId={activeConnId || ""}
          currentDB={currentDB}
          onSelect={handleSelectConnection}
          onSwitchDB={handleSwitchDB}
          onRefresh={refreshConnections}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        {!activeConnId ? (
          /* Welcome page when not connected */
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-900">
            <img src="/icon.png" alt="Interedy" className="w-20 h-20 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">{t.welcome.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t.welcome.subtitle}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t.welcome.hint}</p>
          </div>
        ) : (
        <>
        {/* Key Tree */}
        <div className="flex flex-col flex-shrink-0" style={{ width: keyTreeWidth }}>
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t.keyTree.keys}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAddKey(true)}
                disabled={!activeConnId}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:text-gray-300 dark:disabled:text-gray-600 disabled:hover:bg-transparent transition-colors"
                title={t.toolbar.addKey}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <KeyTree
            connectionId={activeConnId}
            currentDB={currentDB}
            onSelectKey={setSelectedKey}
            selectedKey={selectedKey}
            keyRefresh={keyRefresh}
          />
        </div>

        {/* Resize Handle between KeyTree and Main Content */}
        <ResizeHandle
          side="left"
          initialSize={keyTreeWidth}
          minSize={200}
          maxSize={keyTreeMaxWidth}
          onResize={setKeyTreeWidth}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ minWidth: 320 }}>
          <KeyDetailPanel
            connectionId={activeConnId}
            selectedKey={selectedKey}
            onRefresh={() => {
              setSelectedKey(null);
            }}
          />
          <TerminalPanel connectionId={activeConnId} />
        </div>
        </>
        )}
      </div>

      {/* Bottom: Status Bar */}
      <StatusBar connectionId={activeConnId} connectionName={activeConn?.name || null} />

      {/* Add Key Modal */}
      {showAddKey && (
        <AddKeyModal
          connectionId={activeConnId}
          onClose={() => setShowAddKey(false)}
          onCreated={() => { setSelectedKey(null); setKeyRefresh((n) => n + 1); }}
        />
      )}

      {/* About Dialog */}
      <AboutDialog open={showAbout} onClose={() => setShowAbout(false)} />

      {/* Update Dialog */}
      <UpdateDialog open={showUpdate} onClose={() => setShowUpdate(false)} />
    </>
  );
}

function App() {
  return <AppContent />;
}

export default App;
