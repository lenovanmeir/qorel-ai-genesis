const cases = [
  {
    client: "Northwind Dental Group",
    industry: "Multi-location healthcare",
    before: "Outdated WordPress site, no online booking, 2.1% conversion.",
    after: "AI-powered booking flow + automated follow-up sequences.",
    metrics: [
      { v: "+42%", l: "more leads" },
      { v: "0.8s", l: "load time" },
      { v: "5.6%", l: "conversion" },
      { v: "−31%", l: "support cost" },
    ],
  },
  {
    client: "Atlas Home Services",
    industry: "Local service business",
    before: "Losing 60% of inquiries to slow response times.",
    after: "AI chatbot + instant routing. Leads booked in under 3 mins.",
    metrics: [
      { v: "3×", l: "booked calls" },
      { v: "<3m", l: "response time" },
      { v: "+58%", l: "revenue/mo" },
      { v: "20h", l: "saved/week" },
    ],
  },
  {
    client: "Helix Legal",
    industry: "Boutique law firm",
    before: "Generic brochure site. Zero automation. Manual intake.",
    after: "Conversion-focused redesign + AI intake & qualification.",
    metrics: [
      { v: "+212%", l: "qualified leads" },
      { v: "94", l: "PageSpeed" },
      { v: "+38%", l: "case value" },
      { v: "−45%", l: "intake time" },
    ],
  },
];

export function CaseStudies() {
  return (
    <section id="work" className="relative py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">Selected work</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Before & after — <span className="text-gradient-primary">real numbers.</span>
          </h2>
        </div>

        <div className="mt-16 space-y-6">
          {cases.map((c, i) => (
            <article
              key={c.client}
              className="group relative overflow-hidden rounded-2xl glass p-8 transition-all hover:border-primary/30 md:p-10"
            >
              <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(i + 1).padStart(2, "0")} / Case study
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold md:text-3xl">{c.client}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{c.industry}</p>

                  <dl className="mt-7 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-destructive/80">Before</dt>
                      <dd className="mt-1 text-sm text-muted-foreground">{c.before}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-primary">After</dt>
                      <dd className="mt-1 text-sm">{c.after}</dd>
                    </div>
                  </dl>
                </div>

                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border">
                  {c.metrics.map((m) => (
                    <div key={m.l} className="bg-card p-5">
                      <div className="font-display text-3xl font-semibold text-gradient-primary">
                        {m.v}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                        {m.l}
                      </div>
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
