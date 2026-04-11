import { createContext, useContext, useState, useCallback } from "react";
import zhCN from "./locales/zh-CN";
import enUS from "./locales/en-US";
import type { TranslationKeys } from "./locales/zh-CN";

export type Locale = "zh-CN" | "en-US";

const LOCALES: Record<Locale, TranslationKeys> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

interface LocaleContextValue {
  locale: Locale;
  t: TranslationKeys;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "zh-CN",
  t: zhCN,
  setLocale: () => {},
  toggleLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem("interedy-locale") as Locale | null;
    if (stored && LOCALES[stored]) return stored;
    return "zh-CN";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("interedy-locale", l);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "zh-CN" ? "en-US" : "zh-CN");
  }, [locale, setLocale]);

  return (
    <LocaleContext.Provider value={{ locale, t: LOCALES[locale], setLocale, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n() {
  return useContext(LocaleContext);
}
