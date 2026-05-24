import oldSite from "@/assets/old-website.jpg";
import newSite from "@/assets/new-website.jpg";
import { useT } from "@/i18n/I18nProvider";

export function Problem() {
  const t = useT();
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">{t.problem.eyebrow}</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            {t.problem.title1}<span className="text-gradient-primary">{t.problem.title2}</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">{t.problem.subtitle}</p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="group relative overflow-hidden rounded-2xl glass p-3">
            <div className="absolute left-5 top-5 z-10 rounded-full bg-destructive/15 px-3 py-1 text-xs font-medium text-destructive backdrop-blur">
              {t.problem.oldLabel}
            </div>
            <img
              src={oldSite}
              alt={t.problem.oldAlt}
              className="w-full rounded-xl grayscale transition duration-700 group-hover:grayscale-0"
              loading="lazy"
              width={1280}
              height={800}
            />
          </div>
          <div className="group relative overflow-hidden rounded-2xl glass-strong p-3 border-gradient">
            <div className="absolute left-5 top-5 z-10 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
              {t.problem.newLabel}
            </div>
            <img
              src={newSite}
              alt={t.problem.newAlt}
              className="w-full rounded-xl"
              loading="lazy"
              width={1280}
              height={800}
            />
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.problem.items.map((p, i) => (
            <div
              key={p.title}
              className="group relative overflow-hidden rounded-xl glass p-6 transition-all hover:-translate-y-1 hover:border-primary/30"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shadow-[0_0_12px] shadow-destructive/60" />
                <div>
                  <h3 className="text-base font-semibold">{p.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
