import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight, ChevronDown, Key, RefreshCw, Search, Trash2, Folder, FolderOpen,
} from "lucide-react";
import type { TreeNode } from "../types";
import * as api from "../api/redis";
import { useI18n } from "../i18n";

interface Props {
  connectionId: string | null;
  currentDB: number;
  onSelectKey: (key: string) => void;
  selectedKey: string | null;
  keyRefresh?: number;
}

const SEPARATOR = ":";

function buildTree(keys: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const key of keys) {
    const parts = key.split(SEPARATOR);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const fullPath = parts.slice(0, i + 1).join(SEPARATOR);
      const isLeaf = i === parts.length - 1;

      let node = current.find((n) => n.label === part);
      if (!node) {
        node = {
          key: part,
          label: part,
          fullPath,
          isLeaf,
          children: isLeaf ? undefined : [],
          expanded: false,
          loaded: false,
        };
        current.push(node);
      }
      if (node.children) {
        current = node.children;
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isLeaf !== b.isLeaf) return a.isLeaf ? 1 : -1;
      return a.label.localeCompare(b.label);
    });
    nodes.forEach((n) => n.children && sortNodes(n.children));
  };
  sortNodes(root);
  return root;
}

export const KeyTree: React.FC<Props> = ({ connectionId, currentDB, onSelectKey, selectedKey, keyRefresh }) => {
  const { t } = useI18n();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [pattern, setPattern] = useState("*");
  const [loading, setLoading] = useState(false);

  const loadKeys = useCallback(async () => {
    if (!connectionId) return;
    setLoading(true);
    try {
      const keys = await api.getKeys(connectionId, pattern);
      setTree(buildTree(keys));
    } catch (e) {
      console.error("Failed to load keys", e);
    }
    setLoading(false);
  }, [connectionId, currentDB, pattern, keyRefresh]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const toggleNode = async (node: TreeNode) => {
    node.expanded = !node.expanded;

    if (!node.isLeaf && !node.loaded && connectionId) {
      try {
        const keys = await api.getKeys(connectionId, `${node.fullPath}${SEPARATOR}*`);
        const childTree = buildTree(keys.map((k) => k.slice(node.fullPath.length + SEPARATOR.length)));
        node.children = childTree;
        node.loaded = true;
      } catch (e) {
        console.error("Failed to load children", e);
      }
    }

    setTree([...tree]);
  };

  const handleDelete = async (key: string) => {
    if (!connectionId) return;
    await api.deleteKey(connectionId, key);
    loadKeys();
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isSelected = node.isLeaf && selectedKey === node.fullPath;
    const isFolder = !node.isLeaf;

    return (
      <div key={node.fullPath}>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 cursor-pointer text-sm group transition-colors ${
            isSelected
              ? "bg-brand-700/30 dark:bg-brand-700/40 text-gray-900 dark:text-white"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (isFolder) {
              toggleNode(node);
            } else {
              onSelectKey(node.fullPath);
            }
          }}
        >
          {isFolder ? (
            <>
              {node.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {node.expanded ? (
                <FolderOpen size={13} className="text-yellow-500 dark:text-yellow-500 shrink-0" />
              ) : (
                <Folder size={13} className="text-yellow-500 dark:text-yellow-600 shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-3" />
              <Key size={12} className="text-green-500 dark:text-green-400 shrink-0" />
            </>
          )}
          <span className="truncate flex-1">{node.label}</span>
          {!isFolder && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(node.fullPath);
              }}
              className="hidden group-hover:block p-0.5 rounded hover:bg-red-600/30 text-red-400"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
        {isFolder && node.expanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-850 flex flex-col h-full">
      {/* Search bar */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex-1 min-w-0 flex items-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1">
            <Search size={12} className="text-gray-400 dark:text-gray-500 shrink-0" />
            <input
              className="flex-1 min-w-0 bg-transparent text-sm ml-1.5 focus:outline-none placeholder-gray-400 dark:placeholder-gray-600"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={t.keyTree.searchPlaceholder}
              onKeyDown={(e) => e.key === "Enter" && loadKeys()}
            />
          </div>
          <button
            onClick={loadKeys}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.map((node) => renderNode(node, 0))}
        {tree.length === 0 && !loading && (
          <div className="text-center text-gray-400 dark:text-gray-600 text-xs py-8">
            {connectionId ? t.keyTree.noData : t.keyTree.notConnected}
          </div>
        )}
      </div>
    </div>
  );
};
