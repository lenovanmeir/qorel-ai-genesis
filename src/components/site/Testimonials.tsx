const testimonials = [
  {
    quote:
      "QoreLabs didn't just redesign our site. They rebuilt how we acquire customers. Inbound leads tripled in 60 days.",
    name: "Marcus Holloway",
    role: "CEO, Holloway & Associates",
  },
  {
    quote:
      "The AI automation alone saves us 25+ hours a week. Honestly the best ROI we've ever had on a single hire.",
    name: "Priya Anand",
    role: "Founder, Anand Wellness",
  },
  {
    quote:
      "We finally look like the premium brand we are. The new site closes deals before a sales rep even joins.",
    name: "Daniel Brooks",
    role: "Managing Partner, Brooks Capital",
  },
  {
    quote:
      "Conversion rate went from 1.9% to 6.2%. The team is sharp, fast, and treats our growth like their own.",
    name: "Elena Vasquez",
    role: "COO, Casa Modern Interiors",
  },
];

export function Testimonials() {
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">Loved by founders</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Results clients <span className="text-gradient-primary">talk about.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="relative overflow-hidden rounded-2xl glass p-8 transition-all hover:-translate-y-1 hover:border-primary/30 border-gradient"
            >
              <div className="absolute -right-8 -top-10 font-display text-[10rem] leading-none text-primary/10 select-none">
                "
              </div>
              <blockquote className="relative text-lg leading-relaxed text-foreground/90">
                {t.quote}
              </blockquote>
              <figcaption className="relative mt-6 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/30 text-sm font-semibold text-primary-foreground">
                  {t.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
