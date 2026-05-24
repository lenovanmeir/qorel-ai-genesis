import { Sparkles, RefreshCw, Layers, ShieldCheck, Target, HeartHandshake } from "lucide-react";

const items = [
  { icon: Sparkles, title: "AI-first approach", desc: "Every decision evaluated through an AI & automation lens." },
  { icon: RefreshCw, title: "Monthly optimization", desc: "We don't ship and ghost. We compound results monthly." },
  { icon: Layers, title: "Scalable systems", desc: "Built to grow with you — from 10 leads/mo to 10,000." },
  { icon: ShieldCheck, title: "Future-ready infra", desc: "Modern stack, edge performance, AI-ready from day one." },
  { icon: Target, title: "ROI obsessed", desc: "We track revenue impact, not vanity metrics." },
  { icon: HeartHandshake, title: "Long-term partner", desc: "A team that knows your business inside and out." },
];

export function WhyUs() {
  return (
    <section id="why" className="relative py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">Why QoreLabs</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            More than a <span className="text-gradient-primary">website agency.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Most agencies hand you a brochure and disappear. We become the AI &
            growth team you wish you had in-house.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="group relative overflow-hidden rounded-xl glass p-6 transition-all hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/20 transition-all group-hover:bg-primary/20">
                  <it.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{it.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{it.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
