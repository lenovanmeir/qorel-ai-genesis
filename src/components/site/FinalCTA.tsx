import { useT } from "@/i18n/I18nProvider";

export function FinalCTA() {
  const t = useT();
  return (
    <section id="cta" className="relative py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="relative overflow-hidden rounded-3xl glass-strong p-10 text-center shadow-elevated md:p-20 border-gradient">
          <div className="absolute inset-0 -z-10 bg-grid opacity-50" />
          <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
          <div className="absolute -bottom-32 left-1/2 -z-10 h-64 w-2/3 -translate-x-1/2 rounded-full bg-primary/40 blur-[120px]" />

          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">{t.final.eyebrow}</p>
          <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            {t.final.title1}<span className="text-gradient-primary">{t.final.title2}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{t.final.sub}</p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="https://cal.com"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
            >
              {t.final.ctaPrimary}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <a href="#work" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {t.final.ctaSecondary}
            </a>
          </div>

          <p className="mt-8 text-xs text-muted-foreground/80">{t.final.footnote}</p>
        </div>
      </div>
    </section>
  );
}
