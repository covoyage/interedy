import { useState, useEffect, useCallback } from "react";
import {
  Save, RefreshCw, Trash2, Clock, Tag, Hash, List, FileText, BarChart3, Copy, Check,
} from "lucide-react";
import type { KeyDetail, HashValue, ZSetValue } from "../types";
import * as api from "../api/redis";
import { useI18n } from "../i18n";

interface Props {
  connectionId: string | null;
  selectedKey: string | null;
  onRefresh: () => void;
}

function extractValue(detail: KeyDetail): string {
  const v = detail.value;
  if (v.type === "string") return v.value;
  return JSON.stringify(v.value, null, 2);
}

function extractHashFields(detail: KeyDetail): HashValue[] {
  return detail.value.type === "hash" ? detail.value.value : [];
}

function extractListItems(detail: KeyDetail): string[] {
  return detail.value.type === "list" ? detail.value.value : [];
}

function extractSetMembers(detail: KeyDetail): string[] {
  return detail.value.type === "set" ? detail.value.value : [];
}

function extractZsetMembers(detail: KeyDetail): ZSetValue[] {
  return detail.value.type === "zset" ? detail.value.value : [];
}

export const KeyDetailPanel: React.FC<Props> = ({ connectionId, selectedKey, onRefresh }) => {
  const { t } = useI18n();
  const [detail, setDetail] = useState<KeyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [ttlInput, setTtlInput] = useState("");
  const [newField, setNewField] = useState({ field: "", value: "" });
  const [newListItem, setNewListItem] = useState("");
  const [newSetMember, setNewSetMember] = useState("");
  const [newZsetMember, setNewZsetMember] = useState({ member: "", score: 0 });
  const [copied, setCopied] = useState(false);

  const handleCopyKey = async () => {
    if (!selectedKey) return;
    try {
      await navigator.clipboard.writeText(selectedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = selectedKey;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const loadDetail = useCallback(async () => {
    if (!connectionId || !selectedKey) return;
    setLoading(true);
    try {
      const d = await api.getKeyDetail(connectionId, selectedKey);
      setDetail(d);
      setTtlInput(d.ttl === -1 ? "-1" : String(d.ttl));
      setEditValue(extractValue(d));
    } catch (e) {
      console.error("Failed to load detail", e);
    }
    setLoading(false);
  }, [connectionId, selectedKey]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleSaveValue = async () => {
    if (!connectionId || !selectedKey || !detail) return;
    if (detail.type === "string") {
      await api.setKeyValue(connectionId, selectedKey, editValue);
    }
    loadDetail();
  };

  const handleSetTTL = async () => {
    if (!connectionId || !selectedKey) return;
    const ttl = parseInt(ttlInput);
    if (isNaN(ttl)) return;
    await api.setTTL(connectionId, selectedKey, ttl);
    loadDetail();
  };

  const handleDeleteKey = async () => {
    if (!connectionId || !selectedKey) return;
    await api.deleteKey(connectionId, selectedKey);
    onRefresh();
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "string": return <FileText size={13} className="text-green-500 dark:text-green-400" />;
      case "hash": return <Hash size={13} className="text-blue-500 dark:text-blue-400" />;
      case "list": return <List size={13} className="text-purple-500 dark:text-purple-400" />;
      case "set": return <Tag size={13} className="text-yellow-500 dark:text-yellow-400" />;
      case "zset": return <BarChart3 size={13} className="text-orange-500 dark:text-orange-400" />;
      default: return <FileText size={13} className="text-gray-500 dark:text-gray-400" />;
    }
  };

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      string: t.types.string,
      hash: t.types.hash,
      list: t.types.list,
      set: t.types.set,
      zset: t.types.zset,
      stream: t.types.stream,
    };
    return map[type] || type;
  };

  if (!selectedKey) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm">
        {t.detail.selectKey}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        <RefreshCw size={16} className="animate-spin mr-2" /> {t.detail.loading}
      </div>
    );
  }

  if (!detail) return null;

  const hashFields = extractHashFields(detail);
  const listItems = extractListItems(detail);
  const setMembers = extractSetMembers(detail);
  const zsetMembers = extractZsetMembers(detail);

  const inputCls = "bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:border-brand-500 focus:outline-none";

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Key Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2 mb-2">
          {typeIcon(detail.type)}
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {typeLabel(detail.type)}
          </span>
          <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 font-mono truncate">{selectedKey}</span>
          <button
            onClick={handleCopyKey}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
            title={t.detail.copyKey}
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          </button>
          <button
            onClick={handleDeleteKey}
            className="p-1.5 rounded hover:bg-red-600/20 text-red-400 transition-colors"
            title={t.detail.deleteKey}
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
          <div className="flex items-center gap-1">
            <Clock size={11} />
            <span>{t.detail.ttl}:</span>
            <input
              className="w-16 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-xs focus:border-brand-500 focus:outline-none"
              value={ttlInput}
              onChange={(e) => setTtlInput(e.target.value)}
            />
            <button
              onClick={handleSetTTL}
              className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
            >
              {t.detail.setTTL}
            </button>
          </div>
          <span>{detail.ttl === -1 ? t.detail.neverExpire : `${detail.ttl}${t.detail.seconds}`}</span>
        </div>
      </div>

      {/* Value Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0 flex flex-col select-text">
        {detail.type === "string" && (
          <div className="flex flex-col flex-1">
            <textarea
              className="w-full flex-1 min-h-[120px] bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-3 text-sm font-mono focus:border-brand-500 focus:outline-none resize-none"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleSaveValue}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-brand-600 hover:bg-brand-500 text-white transition-colors"
              >
                <Save size={13} /> {t.detail.save}
              </button>
            </div>
          </div>
        )}

        {detail.type === "hash" && (
          <div className="flex flex-col flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-1.5 font-medium">{t.detail.field}</th>
                  <th className="text-left py-1.5 font-medium">{t.detail.value}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {hashFields.map((f) => (
                  <tr key={f.field} className="border-b border-gray-100 dark:border-gray-800 group">
                    <td className="py-1.5 font-mono text-green-600 dark:text-green-300">{f.field}</td>
                    <td className="py-1.5 font-mono text-gray-600 dark:text-gray-300 truncate max-w-xs">{f.value}</td>
                    <td>
                      <button
                        onClick={async () => {
                          if (!connectionId || !selectedKey) return;
                          await api.deleteHashField(connectionId, selectedKey, f.field);
                          loadDetail();
                        }}
                        className="hidden group-hover:block p-0.5 rounded hover:bg-red-600/30 text-red-400"
                      >
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center gap-2">
              <input
                className={`flex-1 ${inputCls}`}
                placeholder={t.detail.field}
                value={newField.field}
                onChange={(e) => setNewField({ ...newField, field: e.target.value })}
              />
              <input
                className={`flex-1 ${inputCls}`}
                placeholder={t.detail.value}
                value={newField.value}
                onChange={(e) => setNewField({ ...newField, value: e.target.value })}
              />
              <button
                onClick={async () => {
                  if (!connectionId || !selectedKey || !newField.field) return;
                  await api.setHashField(connectionId, selectedKey, newField.field, newField.value);
                  setNewField({ field: "", value: "" });
                  loadDetail();
                }}
                className="px-3 py-1 text-sm rounded bg-brand-600 hover:bg-brand-500 text-white transition-colors"
              >
                {t.detail.add}
              </button>
            </div>
          </div>
        )}

        {detail.type === "list" && (
          <div className="flex flex-col flex-1">
            <div className="space-y-1">
              {listItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-50 dark:bg-gray-900 group"
                >
                  <span className="text-xs text-gray-400 dark:text-gray-500 w-8 text-right">{i}</span>
                  <span className="font-mono text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">{item}</span>
                  <button
                    onClick={async () => {
                      if (!connectionId || !selectedKey) return;
                      await api.executeCommand(connectionId, `LREM ${selectedKey} 1 "${item}"`);
                      loadDetail();
                    }}
                    className="hidden group-hover:block p-0.5 rounded hover:bg-red-600/30 text-red-400"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                className={`flex-1 ${inputCls}`}
                placeholder={t.detail.newElement}
                value={newListItem}
                onChange={(e) => setNewListItem(e.target.value)}
              />
              <button
                onClick={async () => {
                  if (!connectionId || !selectedKey || !newListItem) return;
                  await api.pushListItem(connectionId, selectedKey, newListItem, "right");
                  setNewListItem("");
                  loadDetail();
                }}
                className="px-3 py-1 text-sm rounded bg-brand-600 hover:bg-brand-500 text-white transition-colors"
              >
                RPUSH
              </button>
            </div>
          </div>
        )}

        {detail.type === "set" && (
          <div className="flex flex-col flex-1">
            <div className="flex flex-wrap gap-1.5">
              {setMembers.map((m) => (
                <div
                  key={m}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 dark:bg-gray-900 text-sm group"
                >
                  <span className="font-mono text-yellow-600 dark:text-yellow-300">{m}</span>
                  <button
                    onClick={async () => {
                      if (!connectionId || !selectedKey) return;
                      await api.deleteSetMember(connectionId, selectedKey, m);
                      loadDetail();
                    }}
                    className="hidden group-hover:block p-0.5 rounded hover:bg-red-600/30 text-red-400"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                className={`flex-1 ${inputCls}`}
                placeholder={t.detail.newMember}
                value={newSetMember}
                onChange={(e) => setNewSetMember(e.target.value)}
              />
              <button
                onClick={async () => {
                  if (!connectionId || !selectedKey || !newSetMember) return;
                  await api.addSetMember(connectionId, selectedKey, newSetMember);
                  setNewSetMember("");
                  loadDetail();
                }}
                className="px-3 py-1 text-sm rounded bg-brand-600 hover:bg-brand-500 text-white transition-colors"
              >
                SADD
              </button>
            </div>
          </div>
        )}

        {detail.type === "zset" && (
          <div className="flex flex-col flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-1.5 font-medium w-24">Score</th>
                  <th className="text-left py-1.5 font-medium">Member</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {zsetMembers.map((m) => (
                  <tr key={m.member} className="border-b border-gray-100 dark:border-gray-800 group">
                    <td className="py-1.5 text-orange-500 dark:text-orange-300 font-mono">{m.score}</td>
                    <td className="py-1.5 font-mono text-gray-600 dark:text-gray-300 truncate max-w-xs">{m.member}</td>
                    <td>
                      <button
                        onClick={async () => {
                          if (!connectionId || !selectedKey) return;
                          await api.deleteZSetMember(connectionId, selectedKey, m.member);
                          loadDetail();
                        }}
                        className="hidden group-hover:block p-0.5 rounded hover:bg-red-600/30 text-red-400"
                      >
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                className={`w-24 ${inputCls}`}
                placeholder="Score"
                value={newZsetMember.score || ""}
                onChange={(e) =>
                  setNewZsetMember({ ...newZsetMember, score: parseFloat(e.target.value) || 0 })
                }
              />
              <input
                className={`flex-1 ${inputCls}`}
                placeholder="Member"
                value={newZsetMember.member}
                onChange={(e) => setNewZsetMember({ ...newZsetMember, member: e.target.value })}
              />
              <button
                onClick={async () => {
                  if (!connectionId || !selectedKey || !newZsetMember.member) return;
                  await api.addZSetMember(
                    connectionId,
                    selectedKey,
                    newZsetMember.member,
                    newZsetMember.score
                  );
                  setNewZsetMember({ member: "", score: 0 });
                  loadDetail();
                }}
                className="px-3 py-1 text-sm rounded bg-brand-600 hover:bg-brand-500 text-white transition-colors"
              >
                ZADD
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
