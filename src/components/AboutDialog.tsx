import { useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { useI18n } from "../i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const AboutDialog: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useI18n();
  const [appVersion, setAppVersion] = useState("0.1.0");

  useEffect(() => {
    if (open && "__TAURI_INTERNALS__" in window) {
      import("@tauri-apps/api/app").then((module) => {
        module.getVersion().then((v) => setAppVersion(v));
      });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <img src="/icon.png" alt="Interedy" className="w-20 h-20 object-contain mb-3" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Interedy
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t.about.subtitle}
          </p>
        </div>

        {/* Version */}
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t.about.version} {appVersion}
          </p>
        </div>

        {/* GitHub Link */}
        <a
          href="https://github.com/covoyage/interedy"
          onClick={(e) => {
            e.preventDefault();
            window.open("https://github.com/covoyage/interedy", "_blank");
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
          <span>{t.about.viewOnGitHub}</span>
          <ExternalLink size={16} />
        </a>

        {/* License */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t.about.license}
          </p>
        </div>
      </div>
    </div>
  );
};
