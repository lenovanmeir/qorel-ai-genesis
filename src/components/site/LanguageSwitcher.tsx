import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { LANGS, type Lang } from "@/i18n/translations";
import { Globe, Check } from "lucide-react";

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = LANGS.find((l) => l.code === lang)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="uppercase tracking-wider">{active.code}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl glass-strong p-1 text-sm shadow-elevated">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code as Lang);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5 ${
                l.code === lang ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden>{l.flag}</span>
                <span>{l.label}</span>
              </span>
              {l.code === lang && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
