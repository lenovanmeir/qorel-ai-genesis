import { useT } from "@/i18n/I18nProvider";

export function Testimonials() {
  const t = useT();
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">{t.testimonials.eyebrow}</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            {t.testimonials.title1}<span className="text-gradient-primary">{t.testimonials.title2}</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {t.testimonials.items.map((item) => (
            <figure
              key={item.name}
              className="relative overflow-hidden rounded-2xl glass p-8 transition-all hover:-translate-y-1 hover:border-primary/30 border-gradient"
            >
              <div className="absolute -right-8 -top-10 font-display text-[10rem] leading-none text-primary/10 select-none">
                "
              </div>
              <blockquote className="relative text-lg leading-relaxed text-foreground/90">
                {item.quote}
              </blockquote>
              <figcaption className="relative mt-6 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/30 text-sm font-semibold text-primary-foreground">
                  {item.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
