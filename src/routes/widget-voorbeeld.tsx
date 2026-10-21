import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

// Shows a clinic's website widget on an empty page, exactly as it will look on their site: for Leno before the
// clinic installs it, and to show a clinic in a call. Our own site may always load any clinic's widget.
export const Route = createFileRoute("/widget-voorbeeld")({
  validateSearch: (search: Record<string, unknown>) => ({
    kliniek:
      typeof search.kliniek === "string" && /^[a-z0-9-]{2,60}$/.test(search.kliniek)
        ? search.kliniek
        : "qore-aesthetics",
  }),
  head: () => ({
    meta: [{ title: "Voorbeeld website-widget" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Voorbeeld,
});

function Voorbeeld() {
  const { kliniek } = Route.useSearch();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = import.meta.env.DEV ? "/widget.js" : "https://qoreaesthetics.com/widget.js";
    script.dataset.kliniek = kliniek;
    script.defer = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, [kliniek]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-5 py-16">
      <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Voorbeeld</span>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Zo staat de chat op uw website
      </h1>
      <p className="text-muted-foreground">
        Rechtsonder ziet u de AI-receptioniste zoals bezoekers van de site haar zien. Probeer gerust
        een vraag of een van de knoppen.
      </p>
    </main>
  );
}
