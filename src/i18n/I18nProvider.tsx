import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Dict, type Lang } from "./translations";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
};

const I18nContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "qorelabs.lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("nl");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && ["nl", "fr", "en"].includes(stored)) setLangState(stored);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  };

  const value = useMemo<Ctx>(() => ({ lang, setLang, t: translations[lang] }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
