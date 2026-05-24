import { useI18n } from "@/i18n/I18nProvider";
import type { Lang } from "@/i18n/translations";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const langs: Lang[] = ["nl", "fr"];
  return (
    <div
      className={`inline-flex items-center rounded-full glass p-0.5 text-xs font-medium ${className}`}
      role="group"
      aria-label="Language switcher"
    >
      {langs.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 uppercase tracking-wider transition-colors ${
            lang === l
              ? "bg-primary text-primary-foreground shadow-glow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
