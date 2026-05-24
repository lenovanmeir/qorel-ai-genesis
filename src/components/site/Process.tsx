import { ScanSearch, LayoutTemplate, Cpu } from "lucide-react";

const steps = [
  {
    icon: ScanSearch,
    n: "01",
    title: "AI Website Audit",
    desc: "We analyze your current website and identify lost revenue opportunities — UX gaps, conversion leaks, missed automations.",
  },
  {
    icon: LayoutTemplate,
    n: "02",
    title: "Conversion-Focused Redesign",
    desc: "We redesign your site into a modern, high-converting experience built around real buying behavior — not just aesthetics.",
  },
  {
    icon: Cpu,
    n: "03",
    title: "AI Automation & Scaling",
    desc: "We integrate AI systems and automations that reduce manual work, qualify leads 24/7, and scale your operations.",
  },
];

export function Process() {
  return (
    <section id="process" className="relative py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">How it works</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            A three-step path to an <span className="text-gradient-primary">AI-powered business.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="group relative overflow-hidden rounded-2xl glass p-7 transition-all hover:-translate-y-1 border-gradient"
            >
              <div className="absolute inset-x-0 -top-24 h-48 bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
              <div className="flex items-center justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/30">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="font-display text-5xl font-semibold text-muted-foreground/15">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
