import { useState, useCallback } from "react";
import { X, Download, RefreshCw, ExternalLink } from "lucide-react";
import { useI18n } from "../i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

type UpdateState = "idle" | "checking" | "available" | "latest" | "error" | "downloading" | "downloaded";

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  body: string;
}

export const UpdateDialog: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useI18n();
  const [state, setState] = useState<UpdateState>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const checkForUpdate = useCallback(async () => {
    if (!("__TAURI_INTERNALS__" in window)) return;

    setState("checking");
    setUpdateInfo(null);

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (update) {
        const { getVersion } = await import("@tauri-apps/api/app");
        const currentVersion = await getVersion();
        setUpdateInfo({
          currentVersion,
          latestVersion: update.version,
          body: update.body || "",
        });
        setState("available");
      } else {
        const { getVersion } = await import("@tauri-apps/api/app");
        const currentVersion = await getVersion();
        setUpdateInfo({
          currentVersion,
          latestVersion: currentVersion,
          body: "",
        });
        setState("latest");
      }
    } catch (error) {
      console.error("Failed to check for update:", error);
      setState("error");
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!("__TAURI_INTERNALS__" in window)) return;

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (update) {
        setState("downloading");
        setDownloadProgress(0);

        let totalBytes = 0;
        let downloadedBytes = 0;

        await update.download((event) => {
          if (event.event === "Started") {
            totalBytes = event.data.contentLength || 0;
            downloadedBytes = 0;
            setDownloadProgress(0);
          } else if (event.event === "Progress") {
            downloadedBytes += event.data.chunkLength;
            if (totalBytes > 0) {
              setDownloadProgress(Math.min(Math.round((downloadedBytes / totalBytes) * 100), 100));
            } else {
              setDownloadProgress((prev) => Math.min(prev + 1, 95));
            }
          } else if (event.event === "Finished") {
            setDownloadProgress(100);
          }
        });

        await update.install();
        setState("downloaded");
      }
    } catch (error) {
      console.error("Failed to install update:", error);
      setState("error");
    }
  }, []);

  const restartApp = useCallback(async () => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (error) {
      console.error("Failed to restart app:", error);
    }
  }, []);

  // Auto-check when dialog opens
  const handleOpen = () => {
    if (state === "idle") {
      checkForUpdate();
    }
  };

  // Reset and close
  const handleClose = () => {
    if (state === "downloading") return; // Don't close during download
    onClose();
  };

  // Reset state when dialog closes
  const handleOverlayClick = () => {
    handleClose();
  };

  if (!open) return null;

  // Trigger auto-check on first render
  if (open && state === "idle") {
    // Use setTimeout to avoid setState during render
    setTimeout(handleOpen, 0);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {state !== "downloading" && (
          <div className="absolute top-4 right-4">
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <button
            onClick={state === "error" ? checkForUpdate : undefined}
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              state === "error"
                ? "bg-red-100 dark:bg-red-900/30 cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/50"
                : "bg-blue-100 dark:bg-blue-900/30"
            } transition-colors`}
          >
            <RefreshCw
              size={24}
              className={`text-blue-600 dark:text-blue-400 ${
                state === "checking" ? "animate-spin" : ""
              } ${state === "error" ? "text-red-600 dark:text-red-400" : ""}`}
            />
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {state === "checking"
              ? t.update.checking
              : t.update.check}
          </h2>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Checking state */}
          {state === "checking" && (
            <div className="flex flex-col items-center py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.update.checking}
              </p>
            </div>
          )}

          {/* Error state */}
          {state === "error" && (
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {t.update.error}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.update.errorHint}
              </p>
            </div>
          )}

          {/* Available / Latest / Downloaded state */}
          {(state === "available" || state === "latest" || state === "downloaded") && updateInfo && (
            <>
              <div className="text-center">
                {state === "available" && (
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    {t.update.available}
                  </p>
                )}
                {state === "latest" && (
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                    {t.update.latest}
                  </p>
                )}
                {state === "downloaded" && (
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                    {t.update.downloadComplete}
                  </p>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t.update.currentVersion}:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{updateInfo.currentVersion}</span>
                </div>
                {state === "available" && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t.update.latestVersion}:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{updateInfo.latestVersion}</span>
                  </div>
                )}
              </div>

              {/* Release notes */}
              {state === "available" && updateInfo.body && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t.update.releaseNotes}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    {updateInfo.body}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {state === "available" && (
                <div className="flex gap-3">
                  <a
                    href={`https://github.com/covoyage/interedy/releases/tag/v${updateInfo.latestVersion}`}
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(
                        `https://github.com/covoyage/interedy/releases/tag/v${updateInfo.latestVersion}`,
                        "_blank"
                      );
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
                  >
                    <span>{t.update.releaseNotes}</span>
                    <ExternalLink size={16} />
                  </a>
                  <button
                    onClick={installUpdate}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Download size={16} />
                    <span>{t.update.download}</span>
                  </button>
                </div>
              )}

              {/* Restart buttons */}
              {state === "downloaded" && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    {t.update.restartConfirm}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
                    >
                      {t.update.restartLater}
                    </button>
                    <button
                      onClick={restartApp}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <RefreshCw size={16} />
                      {t.update.restartToUpdate}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Downloading state */}
          {state === "downloading" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t.update.downloading}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{downloadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
