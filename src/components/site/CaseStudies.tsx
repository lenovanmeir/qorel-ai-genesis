import { useT } from "@/i18n/I18nProvider";

export function CaseStudies() {
  const t = useT();
  return (
    <section id="work" className="relative py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">{t.cases.eyebrow}</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            {t.cases.title1}<span className="text-gradient-primary">{t.cases.title2}</span>
          </h2>
        </div>

        <div className="mt-16 space-y-6">
          {t.cases.items.map((c, i) => (
            <article
              key={i}
              className="group relative overflow-hidden rounded-2xl glass p-8 transition-all hover:border-primary/30 md:p-10"
            >
              <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(i + 1).padStart(2, "0")} / {t.cases.caseLabel}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold md:text-3xl">{c.client}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{c.industry}</p>

                  <dl className="mt-7 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-destructive/80">{t.cases.before}</dt>
                      <dd className="mt-1 text-sm text-muted-foreground">{c.before}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-primary">{t.cases.after}</dt>
                      <dd className="mt-1 text-sm">{c.after}</dd>
                    </div>
                  </dl>
                </div>

                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border">
                  {c.metrics.map((m, j) => (
                    <div key={j} className="bg-card p-5">
                      <div className="font-display text-3xl font-semibold text-gradient-primary">{m.v}</div>
                      <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{m.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
