import { useState } from "react";
import {
  Server, Plus, Trash2, Plug, Unplug, Database, Edit3, Sun, Moon, Languages, ChevronDown, Loader2, CheckCircle2, XCircle, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import type { RedisConnection } from "../types";
import * as api from "../api/redis";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../i18n";

interface Props {
  connections: RedisConnection[];
  activeId: string | null;
  currentDB: number;
  onSelect: (id: string) => void;
  onSwitchDB: (db: number) => void;
  onRefresh: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<Props> = ({ connections, activeId, currentDB, onSelect, onSwitchDB, onRefresh, collapsed, onToggleCollapse }) => {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale } = useI18n();
  const [editing, setEditing] = useState<RedisConnection | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDBPicker, setShowDBPicker] = useState(false);
  const [form, setForm] = useState<Omit<RedisConnection, "id">>({
    name: "",
    host: "127.0.0.1",
    port: 6379,
    password: "",
    db: 0,
  });
  const [connecting, setConnecting] = useState<string | null>(null);
  const [testState, setTestState] = useState<"idle" | "testing" | "success" | "fail">("idle");
  const [testMsg, setTestMsg] = useState("");
  const [connectError, setConnectError] = useState("");

  const handleAdd = () => {
    setEditing(null);
    setForm({ name: "", host: "127.0.0.1", port: 6379, password: "", db: 0 });
    setTestState("idle");
    setTestMsg("");
    setShowForm(true);
  };

  const handleEdit = (conn: RedisConnection) => {
    setEditing(conn);
    setForm({ name: conn.name, host: conn.host, port: conn.port, password: conn.password || "", db: conn.db });
    setTestState("idle");
    setTestMsg("");
    setShowForm(true);
  };

  const handleSave = async () => {
    const id = editing?.id || crypto.randomUUID();
    await api.saveConnection({ id, ...form });
    setShowForm(false);
    onRefresh();
  };

  const handleTest = async () => {
    setTestState("testing");
    setTestMsg("");
    try {
      await api.testConnection(form.host, form.port, form.password || null, form.db);
      setTestState("success");
      setTestMsg(t.sidebar.testSuccess);
    } catch (e: any) {
      setTestState("fail");
      setTestMsg(e?.toString() || t.sidebar.testFail);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteConnection(id);
    onRefresh();
  };

  const handleConnect = async (id: string) => {
    setConnecting(id);
    setConnectError("");
    try {
      await api.connect(id);
      onSelect(id);
    } catch (e: any) {
      setConnectError(e?.toString() || t.sidebar.connectFail);
    }
    setConnecting(null);
  };

  const handleDisconnect = async (id: string) => {
    await api.disconnect(id);
    if (activeId === id) onSelect("");
    onRefresh();
  };

  const handleDBSelect = (db: number) => {
    onSwitchDB(db);
    setShowDBPicker(false);
  };

  const activeConn = connections.find((c) => c.id === activeId);

  // Sidebar container with animation
  const sidebarContainer = (
    <div
      className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden transition-[width] duration-200 ease-in-out shrink-0"
      style={{ width: collapsed ? 48 : 240 }}
    >
      {collapsed ? (
  // Collapsed mode: narrow icon strip
        <div className="w-12 flex flex-col h-full items-center py-2 gap-1">
        {/* Expand button */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
          title={t.sidebar.expand}
        >
          <PanelLeftOpen size={16} />
        </button>

        {/* Add connection */}
        <button
          onClick={handleAdd}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          title={t.sidebar.newConnection}
        >
          <Plus size={16} />
        </button>

        <div className="w-6 border-t border-gray-200 dark:border-gray-700 my-1" />

        {/* Connection icons */}
        {connections.map((conn) => (
          <button
            key={conn.id}
            onClick={() => {
              if (activeId === conn.id) return;
              if (connecting) return;
              handleConnect(conn.id);
            }}
            className={`p-1.5 rounded transition-colors relative ${
              activeId === conn.id
                ? "bg-brand-700/20 dark:bg-brand-700/30 text-brand-600 dark:text-brand-400"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
            title={`${conn.name}\n${conn.host}:${conn.port}`}
          >
            {connecting === conn.id ? (
              <Loader2 size={16} className="animate-spin text-brand-500" />
            ) : (
              <Server size={16} />
            )}
            {activeId === conn.id && connecting !== conn.id && (
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
            )}
          </button>
        ))}

        <div className="flex-1" />

        {/* Bottom: theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          title={theme === "dark" ? t.settings.switchToLight : t.settings.switchToDark}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button
          onClick={toggleLocale}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-[10px] font-bold"
          title={locale === "zh-CN" ? t.settings.switchToEN : t.settings.switchToZH}
        >
          {locale === "zh-CN" ? "EN" : "中"}
        </button>
      </div>
      ) : (
  // Expanded mode
      <div className="w-60 flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Database size={14} /> {t.sidebar.title}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleAdd}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            title={t.sidebar.collapse}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
      </div>

      {/* Connection List */}
      <div className="flex-1 overflow-y-auto py-1">
        {connections.map((conn) => (
          <div
            key={conn.id}
            className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
              activeId === conn.id
                ? "bg-brand-700/20 dark:bg-brand-700/30 text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
            onClick={() => onSelect(conn.id)}
          >
            <Server size={14} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{conn.name}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {conn.host}:{conn.port}
              </div>
            </div>
            {connecting === conn.id ? (
              <Loader2 size={14} className="animate-spin text-brand-500 shrink-0" />
            ) : (
              <>
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(conn); }}
                    className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    <Edit3 size={12} />
                  </button>
                  {activeId === conn.id ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDisconnect(conn.id); }}
                      className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-yellow-500 dark:text-yellow-400"
                    >
                      <Unplug size={12} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleConnect(conn.id); }}
                      className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-green-500 dark:text-green-400"
                    >
                      <Plug size={12} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(conn.id); }}
                    className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {activeId === conn.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 shrink-0 group-hover:hidden" />
                )}
              </>
            )}
          </div>
        ))}
        {connections.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-600 text-xs py-8">
            {t.sidebar.empty}
          </div>
        )}
        {connectError && (
          <div className="mx-3 mt-1 px-2 py-1.5 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded break-all">
            {connectError}
          </div>
        )}
      </div>

      {/* DB Switcher (only when connected) */}
      {activeId && activeConn && (
        <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">{t.sidebar.database}</span>
            <button
              onClick={() => setShowDBPicker(!showDBPicker)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              db{currentDB}
              <ChevronDown size={12} />
            </button>
          </div>
          {showDBPicker && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
              {Array.from({ length: 16 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleDBSelect(i)}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    i === currentDB
                      ? "text-brand-600 dark:text-brand-400 font-medium bg-brand-50 dark:bg-brand-900/20"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  db{i}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Controls: Theme & Language */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
          title={theme === "dark" ? t.settings.switchToLight : t.settings.switchToDark}
        >
          {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          <span>{theme === "dark" ? t.settings.light : t.settings.dark}</span>
        </button>
        <button
          onClick={toggleLocale}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
          title={locale === "zh-CN" ? t.settings.switchToEN : t.settings.switchToZH}
        >
          <Languages size={13} />
          <span>{locale === "zh-CN" ? "EN" : "中文"}</span>
        </button>
      </div>
      </div>
      )}
    </div>
  );

  // Connection Form Modal (rendered outside sidebar for collapsed mode)
  const formModal = showForm && (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96 p-5 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold mb-4">
          {editing ? t.sidebar.editConnection : t.sidebar.newConnection}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.sidebar.nameLabel}</label>
            <input
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="My Redis"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.sidebar.hostLabel}</label>
              <input
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
              />
            </div>
            <div className="w-20">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.sidebar.portLabel}</label>
              <input
                type="number"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 6379 })}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.sidebar.passwordLabel}</label>
              <input
                type="password"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={t.sidebar.passwordOptional}
              />
            </div>
            <div className="w-20">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.sidebar.dbLabel}</label>
              <input
                type="number"
                min={0}
                max={15}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                value={form.db}
                onChange={(e) => setForm({ ...form, db: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-5">
          <button
            onClick={handleTest}
            disabled={testState === "testing"}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {testState === "testing" ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
            {t.sidebar.testConnection}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t.sidebar.cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm rounded bg-brand-600 hover:bg-brand-500 text-white transition-colors"
            >
              {t.sidebar.save}
            </button>
          </div>
        </div>
        {testState !== "idle" && testMsg && (
          <div className={`flex items-center gap-1.5 mt-2 text-xs ${
            testState === "success" ? "text-green-600 dark:text-green-400" :
            testState === "fail" ? "text-red-500 dark:text-red-400" :
            "text-gray-500"
          }`}>
            {testState === "success" && <CheckCircle2 size={12} />}
            {testState === "fail" && <XCircle size={12} />}
            {testMsg}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {sidebarContainer}
      {formModal}
    </>
  );
};
