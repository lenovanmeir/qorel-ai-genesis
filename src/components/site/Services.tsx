import {
  LayoutDashboard, TrendingUp, Bot, Magnet, MessageSquare, Wrench, Network, Workflow,
} from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

const icons = [LayoutDashboard, TrendingUp, Bot, Magnet, MessageSquare, Wrench, Network, Workflow];

export function Services() {
  const t = useT();
  return (
    <section id="services" className="relative py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col items-end justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">{t.services.eyebrow}</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              {t.services.title1}<span className="text-gradient-primary">{t.services.title2}</span>{t.services.title3}
            </h2>
          </div>
          <p className="max-w-md text-muted-foreground">{t.services.sub}</p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-2 lg:grid-cols-4">
          {t.services.items.map((s, i) => {
            const Icon = icons[i];
            return (
              <div key={i} className="group relative bg-background p-7 transition-colors hover:bg-card">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/20 transition-all group-hover:bg-primary/20 group-hover:ring-primary/40">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-5 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                <span className="absolute right-6 top-6 text-muted-foreground/40 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">→</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
