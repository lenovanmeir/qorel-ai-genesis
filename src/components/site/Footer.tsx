export function Footer() {
  return (
    <footer className="relative border-t border-border/60 py-14">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <a href="#top" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/40 shadow-glow">
                <span className="text-sm font-bold text-primary-foreground">Q</span>
              </span>
              <span className="font-display text-base font-semibold tracking-tight">
                QoreLabs<span className="text-primary">.io</span>
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Modern AI-powered websites that convert visitors into customers — and
              evolve your business into an automated operation.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Navigate
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                ["Services", "#services"],
                ["Process", "#process"],
                ["Work", "#work"],
                ["Why us", "#why"],
              ].map(([l, h]) => (
                <li key={l}>
                  <a href={h} className="text-muted-foreground transition-colors hover:text-foreground">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Contact
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="mailto:hello@qorelabs.io" className="text-muted-foreground transition-colors hover:text-foreground">
                  hello@qorelabs.io
                </a>
              </li>
              <li>
                <a href="#cta" className="text-muted-foreground transition-colors hover:text-foreground">
                  Book a call
                </a>
              </li>
              <li className="flex gap-4 pt-2">
                {["X", "in", "IG"].map((s) => (
                  <a
                    key={s}
                    href="#"
                    className="grid h-9 w-9 place-items-center rounded-full glass text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {s}
                  </a>
                ))}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} QoreLabs.io — All rights reserved.</span>
          <span className="font-mono">Built with intent. Designed for ROI.</span>
        </div>
      </div>
    </footer>
  );
}
