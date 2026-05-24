import { Sparkles, RefreshCw, Layers, ShieldCheck, Target, HeartHandshake } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

const icons = [Sparkles, RefreshCw, Layers, ShieldCheck, Target, HeartHandshake];

export function WhyUs() {
  const t = useT();
  return (
    <section id="why" className="relative py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">{t.why.eyebrow}</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            {t.why.title1}<span className="text-gradient-primary">{t.why.title2}</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">{t.why.sub}</p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {t.why.items.map((it, i) => {
            const Icon = icons[i];
            return (
              <div key={i} className="group relative overflow-hidden rounded-xl glass p-6 transition-all hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/20 transition-all group-hover:bg-primary/20">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{it.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{it.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
