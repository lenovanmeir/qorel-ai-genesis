import loom from "@/assets/loom-preview.jpg";
import { Play } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

export function LoomOffer() {
  const t = useT();
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">{t.loom.eyebrow}</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              {t.loom.title1}<span className="text-gradient-primary">{t.loom.title2}</span>{t.loom.title3}
            </h2>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">{t.loom.desc}</p>

            <ul className="mt-8 space-y-3 text-sm">
              {t.loom.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px] shadow-primary/60" />
                  <span className="text-muted-foreground">{b}</span>
                </li>
              ))}
            </ul>

            <a
              href="#cta"
              className="group mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
            >
              {t.loom.cta}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl glass-strong p-2 shadow-elevated border-gradient">
              <div className="relative">
                <img
                  src={loom}
                  alt={t.loom.imgAlt}
                  className="w-full rounded-xl"
                  loading="lazy"
                  width={1280}
                  height={800}
                />
                <button aria-label={t.loom.playAria} className="absolute inset-0 grid place-items-center">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform hover:scale-110">
                    <Play className="h-7 w-7 fill-current" />
                  </span>
                </button>
              </div>
              <div className="flex items-center justify-between px-3 py-3 text-xs text-muted-foreground">
                <span className="font-mono">{t.loom.previewLabel}</span>
                <span>{t.loom.previewMeta}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
