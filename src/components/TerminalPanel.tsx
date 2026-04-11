import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Send, Terminal } from "lucide-react";
import type { CommandResult } from "../types";
import * as api from "../api/redis";
import { useI18n } from "../i18n";

// Common Redis commands grouped by category
const REDIS_COMMANDS = [
  // Keys
  "COPY", "DEL", "DUMP", "EXISTS", "EXPIRE", "EXPIREAT", "EXPIRETIME", "KEYS", "MIGRATE", "MOVE",
  "OBJECT", "PERSIST", "PEXPIRE", "PEXPIREAT", "PEXPIRETIME", "PTTL", "RANDOMKEY", "RENAME",
  "RENAMENX", "RESTORE", "SCAN", "SORT", "TOUCH", "TTL", "TYPE", "UNLINK", "WAIT", "WAITAOF",
  // String
  "APPEND", "DECR", "DECRBY", "GET", "GETDEL", "GETEX", "GETRANGE", "GETSET", "INCR",
  "INCRBY", "INCRBYFLOAT", "LCS", "MGET", "MSET", "MSETNX", "PSETEX", "SET",
  "SETEX", "SETNX", "SETRANGE", "STRLEN", "SUBSTR",
  // List
  "BLMOVE", "BLMPOP", "BLPOP", "BRPOP", "BRPOPLPUSH", "LINDEX", "LINSERT", "LLEN", "LMOVE",
  "LMPOP", "LPOP", "LPOS", "LPUSH", "LPUSHX", "LRANGE", "LREM", "LSET", "LTRIM",
  "RPOP", "RPOPLPUSH", "RPUSH", "RPUSHX",
  // Hash
  "HDEL", "HEXISTS", "HGET", "HGETALL", "HINCRBY", "HINCRBYFLOAT", "HKEYS", "HLEN", "HMGET",
  "HMSET", "HRANDFIELD", "HSCAN", "HSET", "HSETNX", "HSTRLEN", "HVALS",
  // Set
  "SADD", "SCARD", "SDIFF", "SDIFFSTORE", "SINTER", "SINTERCARD", "SINTERSTORE", "SISMEMBER",
  "SMISMEMBER", "SMEMBERS", "SMOVE", "SPOP", "SRANDMEMBER", "SREM", "SSCAN", "SUNION",
  "SUNIONSTORE",
  // Sorted Set
  "BZMPOP", "BZPOPMAX", "BZPOPMIN", "ZADD", "ZCARD", "ZCOUNT", "ZDIFF", "ZDIFFSTORE", "ZINCRBY",
  "ZINTER", "ZINTERCARD", "ZINTERSTORE", "ZLEXCOUNT", "ZMPOP", "ZMSCORE", "ZPOPMAX", "ZPOPMIN",
  "ZRANDMEMBER", "ZRANGE", "ZRANGEBYLEX", "ZRANGEBYRANK", "ZRANGEBYSCORE", "ZRANGESTORE", "ZRANK",
  "ZREM", "ZREMRANGEBYLEX", "ZREMRANGEBYRANK", "ZREMRANGEBYSCORE", "ZREVRANGE", "ZREVRANGEBYLEX",
  "ZREVRANGEBYRANK", "ZREVRANGEBYSCORE", "ZREVRANK", "ZSCAN", "ZSCORE", "ZUNION", "ZUNIONSTORE",
  // Server
  "ACL", "BGREWRITEAOF", "BGSAVE", "COMMAND", "CONFIG", "DBSIZE", "DEBUG", "FLUSHALL",
  "FLUSHDB", "INFO", "LASTSAVE", "LATENCY", "MEMORY", "MODULE", "MONITOR", "PSYNC", "REPLICAOF",
  "ROLE", "SAVE", "SHUTDOWN", "SLAVEOF", "SLOWLOG", "SWAPDB", "SYNC", "TIME",
  // Connection
  "AUTH", "CLIENT", "CLUSTER", "ECHO", "HELLO", "PING", "SELECT", "QUIT",
  // Stream
  "XACK", "XADD", "XAUTOCLAIM", "XCLAIM", "XDEL", "XGROUP", "XINFO", "XLEN", "XPENDING",
  "XRANGE", "XREAD", "XREADGROUP", "XREVRANGE", "XSETID", "XTRIM",
  // Pub/Sub
  "PSUBSCRIBE", "PUBLISH", "PUBSUB", "PUNSUBSCRIBE", "SUBSCRIBE", "UNSUBSCRIBE",
  // Transaction
  "DISCARD", "EXEC", "MULTI", "UNWATCH", "WATCH",
  // HyperLogLog
  "PFADD", "PFCOUNT", "PFMERGE",
  // Geo
  "GEOADD", "GEODIST", "GEOHASH", "GEOPOS", "GEORADIUS", "GEORADIUSBYMEMBER", "GEOSEARCH",
  "GEOSEARCHSTORE",
  // Bitmap
  "BITCOUNT", "BITFIELD", "BITFIELD_RO", "BITOP", "BITPOS", "GETBIT", "SETBIT",
  // Scripting
  "EVAL", "EVALSHA", "EVAL_RO", "EVALSHA_RO", "FCALL", "FCALL_RO", "FUNCTION", "SCRIPT",
];

interface Props {
  connectionId: string | null;
}

interface HistoryEntry {
  command: string;
  result: CommandResult;
  timestamp: number;
}

export const TerminalPanel: React.FC<Props> = ({ connectionId }) => {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [suggestionStyle, setSuggestionStyle] = useState<React.CSSProperties>({});
  const suggestionRef = useRef<HTMLDivElement>(null);

  const updateSuggestionPos = useCallback(() => {
    if (inputWrapperRef.current) {
      const rect = inputWrapperRef.current.getBoundingClientRect();
      setSuggestionStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        zIndex: 9999,
      });
    }
  }, []);

  // Filter suggestions based on input
  useEffect(() => {
    const parts = input.split(/\s+/);
    const firstWord = parts[0].toUpperCase();
    if (firstWord.length === 0 || parts.length > 1) {
      setSuggestions([]);
      setSelectedSuggestion(-1);
    } else {
      const matches = REDIS_COMMANDS.filter((cmd) => cmd.startsWith(firstWord));
      setSuggestions(matches.length > 0 && matches[0] !== firstWord ? matches : []);
      setSelectedSuggestion(-1);
    }
    updateSuggestionPos();
  }, [input, updateSuggestionPos]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        inputWrapperRef.current && !inputWrapperRef.current.contains(target) &&
        suggestionRef.current && !suggestionRef.current.contains(target)
      ) {
        setSuggestions([]);
        setSelectedSuggestion(-1);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const execute = async () => {
    if (!connectionId || !input.trim()) return;
    const cmd = input.trim();
    setInput("");
    setCommandHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);

    try {
      const result = await api.executeCommand(connectionId, cmd);
      setHistory((prev) => [...prev, { command: cmd, result, timestamp: Date.now() }]);
    } catch (e: any) {
      setHistory((prev) => [
        ...prev,
        { command: cmd, result: { success: false, error: e.toString() }, timestamp: Date.now() },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Suggestion navigation
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (selectedSuggestion > 0) {
          setSelectedSuggestion((prev) => prev - 1);
        } else {
          setSelectedSuggestion(-1);
        }
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && selectedSuggestion >= 0)) {
        e.preventDefault();
        if (selectedSuggestion >= 0) {
          applySuggestion(suggestions[selectedSuggestion]);
        } else if (suggestions.length === 1) {
          applySuggestion(suggestions[0]);
        }
        return;
      }
      if (e.key === "Escape") {
        setSuggestions([]);
        setSelectedSuggestion(-1);
        return;
      }
    }

    if (e.key === "Enter") {
      execute();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(newIndex);
      if (newIndex >= 0) {
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
      setHistoryIndex(newIndex);
      if (newIndex >= 0) {
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else {
        setInput("");
      }
    }
  };

  const applySuggestion = (cmd: string) => {
    const rest = input.slice(input.split(/\s+/)[0].length);
    setInput(cmd.toLowerCase() + rest);
    setSuggestions([]);
    setSelectedSuggestion(-1);
    inputRef.current?.focus();
  };

  const [panelHeight, setPanelHeight] = useState(224); // default 224px = h-56
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
  }, [panelHeight]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const delta = dragStartY.current - e.clientY;
      const newHeight = Math.max(120, Math.min(600, dragStartHeight.current + delta));
      setPanelHeight(newHeight);
    };
    const handleUp = () => setIsDragging(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging]);

  return (
    <div
      style={{ height: panelHeight }}
      className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col"
    >
      {/* Drag Handle */}
      <div
        onMouseDown={handleDragStart}
        className={`flex items-center justify-center h-1.5 cursor-row-resize hover:bg-brand-500/20 transition-colors ${isDragging ? "bg-brand-500/30" : ""}`}
      >
        <div className="w-8 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      {/* Header */}
      <div className="px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-gray-100 dark:bg-gray-800/50">
        <Terminal size={13} className="text-green-500 dark:text-green-400" />
        <span className="text-xs text-gray-500 dark:text-gray-400">{t.terminal.title}</span>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs space-y-1.5 select-text">
        {history.map((entry, i) => (
          <div key={i}>
            <div className="text-green-600 dark:text-green-400">
              &gt; {entry.command}
            </div>
            <div className={entry.result.success ? "text-gray-700 dark:text-gray-300" : "text-red-500 dark:text-red-400"}>
              {entry.result.success
                ? entry.result.data || "(OK)"
                : `(error) ${entry.result.error}`}
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <div className="text-gray-400 dark:text-gray-600">{t.terminal.hint}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div ref={inputWrapperRef} className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
        <span className="text-green-600 dark:text-green-400 text-sm font-mono">&gt;</span>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-sm font-mono focus:outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connectionId ? t.terminal.inputPlaceholder : t.terminal.notConnected}
          disabled={!connectionId}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          onClick={execute}
          disabled={!connectionId || !input.trim()}
          className="p-1.5 rounded bg-brand-600 hover:bg-brand-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white transition-colors"
        >
          <Send size={12} />
        </button>
      </div>

      {/* Suggestions Portal */}
      {suggestions.length > 0 && createPortal(
        <div
          ref={suggestionRef}
          style={suggestionStyle}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((cmd, idx) => (
            <button
              key={cmd}
              type="button"
              onClick={() => applySuggestion(cmd)}
              className={`w-full text-left px-3 py-1 text-xs font-mono transition-colors ${
                idx === selectedSuggestion
                  ? "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {cmd}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
