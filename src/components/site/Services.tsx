import {
  LayoutDashboard,
  TrendingUp,
  Bot,
  Magnet,
  MessageSquare,
  Wrench,
  Network,
  Workflow,
} from "lucide-react";

const services = [
  { icon: LayoutDashboard, title: "Website Redesign", desc: "Modern, high-trust sites that turn visitors into buyers." },
  { icon: TrendingUp, title: "Conversion Optimization", desc: "Data-driven CRO that compounds every percentage point." },
  { icon: Bot, title: "AI Automations", desc: "Replace repetitive work with reliable AI workflows." },
  { icon: Magnet, title: "Lead Generation Systems", desc: "Multi-channel pipelines that fill your calendar." },
  { icon: MessageSquare, title: "AI Chatbots", desc: "24/7 agents that qualify leads and answer instantly." },
  { icon: Wrench, title: "Maintenance & Support", desc: "Monthly optimization so your site keeps improving." },
  { icon: Network, title: "Vertical AI Integration", desc: "Industry-specific AI stacks tuned to your business." },
  { icon: Workflow, title: "Business Process Automation", desc: "Connect tools, eliminate handoffs, save 20+ hrs/week." },
];

export function Services() {
  return (
    <section id="services" className="relative py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col items-end justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">What we do</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Everything you need to become an <span className="text-gradient-primary">AI-powered company.</span>
            </h2>
          </div>
          <p className="max-w-md text-muted-foreground">
            We don't just hand you a website. We architect a system that compounds —
            web, AI, and automation working as one.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <div
              key={s.title}
              className="group relative bg-background p-7 transition-colors hover:bg-card"
            >
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/20 transition-all group-hover:bg-primary/20 group-hover:ring-primary/40">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-5 text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <span className="absolute right-6 top-6 text-muted-foreground/40 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
                →
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
