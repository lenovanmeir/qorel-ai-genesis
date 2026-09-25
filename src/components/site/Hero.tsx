import heroBg from "@/assets/hero-bg.jpg";
import dashboard from "@/assets/dashboard-mockup.jpg";
import { useT } from "@/i18n/I18nProvider";

export function Hero() {
  const t = useT();
  return (
    <section id="top" className="relative isolate overflow-hidden pt-36 pb-24 md:pt-44 md:pb-32">
      <div className="absolute inset-0 -z-10">
        <img
          src={heroBg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
      </div>

      <div className="mx-auto max-w-7xl px-5 text-center">
        <h1
          className="animate-fade-up mx-auto max-w-5xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="text-gradient">{t.hero.title1}</span>
          <span className="text-gradient-primary">{t.hero.title2}</span>
        </h1>

        <p
          className="animate-fade-up mx-auto mt-7 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl"
          style={{ animationDelay: "0.2s" }}
        >
          {t.hero.sub}
        </p>

        <div
          className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: "0.3s" }}
        >
          <a
            href="#cta"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
          >
            <span className="relative z-10">{t.hero.ctaPrimary}</span>
            <span className="relative z-10 transition-transform group-hover:translate-x-0.5">→</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </a>
          <a
            href="#services"
            className="inline-flex items-center gap-2 rounded-full glass px-7 py-3.5 text-sm font-medium transition-colors hover:bg-white/5"
          >
            {t.hero.ctaSecondary}
          </a>
        </div>

        <div
          className="animate-fade-up relative mx-auto mt-20 max-w-6xl"
          style={{ animationDelay: "0.5s" }}
        >
          <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[3rem] bg-primary/20 blur-3xl" />
          <div className="overflow-hidden rounded-2xl glass-strong p-2 shadow-elevated border-gradient">
            <img
              src={dashboard}
              alt="QoreLabs AI dashboard preview"
              className="w-full rounded-xl"
              width={1600}
              height={1024}
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
