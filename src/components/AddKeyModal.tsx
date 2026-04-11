import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, Plus, Trash2 } from "lucide-react";
import type { RedisKeyType } from "../types";
import * as api from "../api/redis";
import { useI18n } from "../i18n";

interface Props {
  connectionId: string | null;
  onClose: () => void;
  onCreated: () => void;
}

const inputCls =
  "bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none";

export const AddKeyModal: React.FC<Props> = ({ connectionId, onClose, onCreated }) => {
  const { t } = useI18n();

  const KEY_TYPES: { value: RedisKeyType; label: string }[] = [
    { value: "string", label: t.types.string },
    { value: "hash", label: t.types.hash },
    { value: "list", label: t.types.list },
    { value: "set", label: t.types.set },
    { value: "zset", label: t.types.zset },
  ];

  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState<RedisKeyType>("string");
  const [stringValue, setStringValue] = useState("");

  // Hash: field-value pairs
  const [hashFields, setHashFields] = useState([{ field: "", value: "" }]);

  // List: multiple values
  const [listValues, setListValues] = useState([""]);

  // Set: multiple members
  const [setMembers, setSetMembers] = useState([""]);

  // ZSet: score-member pairs
  const [zsetMembers, setZsetMembers] = useState([{ score: "", member: "" }]);

  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const updateDropdownPos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = typeRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideTrigger && !insideDropdown) {
        setTypeOpen(false);
      }
    };
    if (typeOpen) {
      updateDropdownPos();
      document.addEventListener("mousedown", handleClick);
      window.addEventListener("resize", updateDropdownPos);
      window.addEventListener("scroll", updateDropdownPos, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", updateDropdownPos);
      window.removeEventListener("scroll", updateDropdownPos, true);
    };
  }, [typeOpen, updateDropdownPos]);

  const handleCreate = async () => {
    if (!connectionId || !keyName) return;

    switch (keyType) {
      case "string":
        await api.setKeyValue(connectionId, keyName, stringValue);
        break;
      case "hash": {
        for (const { field, value } of hashFields) {
          if (field) {
            await api.setHashField(connectionId, keyName, field, value);
          }
        }
        break;
      }
      case "list": {
        for (const v of listValues) {
          if (v) {
            await api.pushListItem(connectionId, keyName, v, "right");
          }
        }
        break;
      }
      case "set": {
        for (const member of setMembers) {
          if (member) {
            await api.addSetMember(connectionId, keyName, member);
          }
        }
        break;
      }
      case "zset": {
        for (const { score, member } of zsetMembers) {
          const s = parseFloat(score);
          if (!isNaN(s) && member) {
            await api.addZSetMember(connectionId, keyName, member, s);
          }
        }
        break;
      }
    }

    onCreated();
    onClose();
  };

  // ─── Value section per type ─────────────────────────────────

  const renderValueSection = () => {
    switch (keyType) {
      case "string":
        return (
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.addKey.initialValue}</label>
            <textarea
              className={`${inputCls} w-full h-24 resize-none`}
              value={stringValue}
              onChange={(e) => setStringValue(e.target.value)}
              placeholder="Hello World"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        );

      case "hash":
        return (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">{t.addKey.initialValue}</label>
              <button
                type="button"
                onClick={() => setHashFields([...hashFields, { field: "", value: "" }])}
                className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                <Plus size={12} /> {t.addKey.addField}
              </button>
            </div>
            <div className="space-y-2">
              {hashFields.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={item.field}
                    onChange={(e) => {
                      const next = [...hashFields];
                      next[idx] = { ...next[idx], field: e.target.value };
                      setHashFields(next);
                    }}
                    placeholder="field"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <input
                    className={`${inputCls} flex-1`}
                    value={item.value}
                    onChange={(e) => {
                      const next = [...hashFields];
                      next[idx] = { ...next[idx], value: e.target.value };
                      setHashFields(next);
                    }}
                    placeholder="value"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {hashFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setHashFields(hashFields.filter((_, i) => i !== idx))}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "list":
        return (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">{t.addKey.initialValue}</label>
              <button
                type="button"
                onClick={() => setListValues([...listValues, ""])}
                className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                <Plus size={12} /> {t.addKey.addItem}
              </button>
            </div>
            <div className="space-y-2">
              {listValues.map((v, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={v}
                    onChange={(e) => {
                      const next = [...listValues];
                      next[idx] = e.target.value;
                      setListValues(next);
                    }}
                    placeholder={t.addKey.placeholder}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {listValues.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setListValues(listValues.filter((_, i) => i !== idx))}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "set":
        return (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">{t.addKey.initialValue}</label>
              <button
                type="button"
                onClick={() => setSetMembers([...setMembers, ""])}
                className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                <Plus size={12} /> {t.addKey.addItem}
              </button>
            </div>
            <div className="space-y-2">
              {setMembers.map((m, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={m}
                    onChange={(e) => {
                      const next = [...setMembers];
                      next[idx] = e.target.value;
                      setSetMembers(next);
                    }}
                    placeholder="member"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {setMembers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSetMembers(setMembers.filter((_, i) => i !== idx))}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "zset":
        return (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">{t.addKey.initialValue}</label>
              <button
                type="button"
                onClick={() => setZsetMembers([...zsetMembers, { score: "", member: "" }])}
                className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                <Plus size={12} /> {t.addKey.addItem}
              </button>
            </div>
            <div className="space-y-2">
              {zsetMembers.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className={`${inputCls} w-24 flex-shrink-0`}
                    value={item.score}
                    onChange={(e) => {
                      const next = [...zsetMembers];
                      next[idx] = { ...next[idx], score: e.target.value };
                      setZsetMembers(next);
                    }}
                    placeholder="score"
                    type="text"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <input
                    className={`${inputCls} flex-1`}
                    value={item.member}
                    onChange={(e) => {
                      const next = [...zsetMembers];
                      next[idx] = { ...next[idx], member: e.target.value };
                      setZsetMembers(next);
                    }}
                    placeholder="member"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {zsetMembers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setZsetMembers(zsetMembers.filter((_, i) => i !== idx))}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-base font-semibold">{t.addKey.title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.addKey.keyName}</label>
            <input
              className={`${inputCls} w-full`}
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="user:1:name"
              autoFocus
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <div ref={typeRef}>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.addKey.type}</label>
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setTypeOpen(!typeOpen)}
                className="w-full flex items-center justify-between bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                <span>{KEY_TYPES.find((kt) => kt.value === keyType)?.label}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${typeOpen ? "rotate-180" : ""}`} />
              </button>
              {typeOpen && createPortal(
                <div ref={dropdownRef} style={dropdownStyle} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg overflow-hidden">
                  {KEY_TYPES.map((kt) => (
                    <button
                      key={kt.value}
                      type="button"
                      onClick={() => { setKeyType(kt.value); setTypeOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                        keyType === kt.value
                          ? "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {kt.label}
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>
          </div>

          {renderValueSection()}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {t.sidebar.cancel}
          </button>
          <button
            onClick={handleCreate}
            disabled={!keyName}
            className="px-4 py-1.5 text-sm rounded bg-brand-600 hover:bg-brand-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white transition-colors"
          >
            {t.addKey.create}
          </button>
        </div>
      </div>
    </div>
  );
};
