import { useState, useEffect } from "react";
import { Activity, Database } from "lucide-react";
import * as api from "../api/redis";
import { useI18n } from "../i18n";

interface Props {
  connectionId: string | null;
  connectionName: string | null;
}

export const StatusBar: React.FC<Props> = ({ connectionId, connectionName }) => {
  const { t } = useI18n();
  const [dbSize, setDbSize] = useState<number | null>(null);
  const [memory, setMemory] = useState<string>("");

  useEffect(() => {
    if (!connectionId) {
      setDbSize(null);
      setMemory("");
      return;
    }

    const load = async () => {
      try {
        const size = await api.getDBSize(connectionId);
        setDbSize(size);

        const info = await api.getDBInfo(connectionId, "memory");
        const match = info.match(/used_memory_human:(\S+)/);
        if (match) setMemory(match[1]);
      } catch {}
    };

    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [connectionId]);

  return (
    <div className="h-6 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center px-3 text-xs text-gray-500 dark:text-gray-500 gap-4">
      {connectionId ? (
        <>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
            <span className="text-green-600 dark:text-green-400">{connectionName}</span>
          </div>
          {dbSize !== null && (
            <div className="flex items-center gap-1">
              <Database size={10} />
              <span>{dbSize} {t.statusBar.keys}</span>
            </div>
          )}
          {memory && (
            <div className="flex items-center gap-1">
              <Activity size={10} />
              <span>{t.statusBar.memory}: {memory}</span>
            </div>
          )}
        </>
      ) : (
        <span>{t.statusBar.notConnected}</span>
      )}
    </div>
  );
};
