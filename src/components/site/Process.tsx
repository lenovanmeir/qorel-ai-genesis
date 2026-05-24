import { ScanSearch, LayoutTemplate, Cpu } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

const icons = [ScanSearch, LayoutTemplate, Cpu];

export function Process() {
  const t = useT();
  return (
    <section id="process" className="relative py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">{t.process.eyebrow}</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            {t.process.title1}<span className="text-gradient-primary">{t.process.title2}</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {t.process.steps.map((s, i) => {
            const Icon = icons[i];
            return (
              <div
                key={s.title}
                className="group relative overflow-hidden rounded-2xl glass p-7 transition-all hover:-translate-y-1 border-gradient"
              >
                <div className="absolute inset-x-0 -top-24 h-48 bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/30">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-display text-5xl font-semibold text-muted-foreground/15">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
