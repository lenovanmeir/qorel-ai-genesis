import { useCallback, useEffect, useState } from "react";

// The Supabase function "widget" keeps each clinic's website widget: look, welcome text and the sites it may run on.
const WIDGET_URL = "https://gqigmmezcmtwusgbdxny.supabase.co/functions/v1/widget";

type Widget = {
  clinic_id: string;
  kleur: string;
  logo_url: string | null;
  weergavenaam: string | null;
  welkom_nl: string | null;
  welkom_fr: string | null;
  welkom_en: string | null;
  domeinen: string[];
  positie: "rechts" | "links";
  max_per_dag: number;
  is_actief: boolean;
  clinics: { name: string; slug: string; website_url: string | null };
};

type Kliniek = { id: string; name: string; slug: string; website_url: string | null };

// What Leno edits: the same fields, with the domains as one line of text.
type Concept = Omit<Widget, "domeinen" | "clinics"> & { domeinen: string };

const naarConcept = (w: Widget): Concept => ({ ...w, domeinen: w.domeinen.join(", ") });

const scriptRegel = (slug: string) =>
  `<script src="https://qoreaesthetics.com/widget.js" data-kliniek="${slug}" defer></script>`;

const domeinVan = (url: string | null) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};

const veld =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2";
const knop =
  "rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary disabled:opacity-50";
const hoofdknop =
  "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50";

export function WidgetBeheer({ sleutel }: { sleutel: string }) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [klinieken, setKlinieken] = useState<Kliniek[]>([]);
  const [concepten, setConcepten] = useState<Record<string, Concept>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [nieuw, setNieuw] = useState("");
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<Record<string, string>>({});
  const [fout, setFout] = useState<string | null>(null);

  const zegt = (id: string, tekst: string) => setMelding((m) => ({ ...m, [id]: tekst }));

  const ophalen = useCallback(async () => {
    setFout(null);
    try {
      const antwoord = await fetch(`${WIDGET_URL}?beheer=1`, {
        headers: { "x-beheercode": sleutel },
      });
      const data = await antwoord.json();
      if (!antwoord.ok) throw new Error(data?.fout ?? `status ${antwoord.status}`);
      setWidgets(data.widgets);
      setKlinieken(data.klinieken);
      setConcepten(
        Object.fromEntries((data.widgets as Widget[]).map((w) => [w.clinic_id, naarConcept(w)])),
      );
    } catch (e) {
      setFout(`De widgets laden lukte niet (${e instanceof Error ? e.message : "onbekend"}).`);
    }
  }, [sleutel]);

  useEffect(() => {
    ophalen();
  }, [ophalen]);

  const bewaren = async (
    c: Concept,
    gelukt = "Bewaard. De widget gebruikt het binnen 5 minuten.",
  ) => {
    setBezig(c.clinic_id);
    try {
      const antwoord = await fetch(WIDGET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-beheercode": sleutel },
        body: JSON.stringify({
          instellingen: { ...c, domeinen: c.domeinen.split(/[\s,]+/).filter(Boolean) },
        }),
      });
      const data = await antwoord.json();
      if (!antwoord.ok) throw new Error(data?.fout ?? `status ${antwoord.status}`);
      zegt(c.clinic_id, gelukt);
      await ophalen();
    } catch (e) {
      zegt(c.clinic_id, e instanceof Error ? e.message : "Bewaren lukte niet");
    } finally {
      setBezig(null);
    }
  };

  const toevoegen = async () => {
    const k = klinieken.find((x) => x.id === nieuw);
    if (!k) return;
    const domein = domeinVan(k.website_url);
    await bewaren(
      {
        clinic_id: k.id,
        kleur: "#9a9cff",
        logo_url: null,
        weergavenaam: k.name,
        welkom_nl: null,
        welkom_fr: null,
        welkom_en: null,
        domeinen: domein,
        positie: "rechts",
        max_per_dag: 300,
        is_actief: true,
      },
      "Toegevoegd. Pas kleur en welkomsttekst aan en kopieer de code.",
    );
    setNieuw("");
    setOpen(k.id);
  };

  const kopieer = async (w: Widget) => {
    try {
      await navigator.clipboard.writeText(scriptRegel(w.clinics.slug));
      zegt(w.clinic_id, "Code gekopieerd. Plak hem vóór </body> op de site (zie het stappenplan).");
    } catch {
      zegt(w.clinic_id, `Kopiëren lukte niet. Selecteer zelf: ${scriptRegel(w.clinics.slug)}`);
    }
  };

  const testen = async (w: Widget) => {
    setBezig(w.clinic_id);
    try {
      const antwoord = await fetch(`${WIDGET_URL}?test=${w.clinics.slug}`, {
        headers: { "x-beheercode": sleutel },
      });
      const data = await antwoord.json();
      zegt(
        w.clinic_id,
        `${data.gevonden ? "✅" : "❌"} ${data.uitleg ?? data.fout ?? ""}${data.url ? ` (${data.url})` : ""}`,
      );
    } catch {
      zegt(w.clinic_id, "Testen lukte niet.");
    } finally {
      setBezig(null);
    }
  };

  const zonderWidget = klinieken.filter((k) => !widgets.some((w) => w.clinic_id === k.id));

  return (
    <section className="mt-10 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-foreground">Website-widget</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Eén regel op de site van de kliniek. Kleur, tekst en toegestane websites past u hier aan,
        zonder dat de kliniek iets opnieuw moet plakken. De AI antwoordt alleen voor klinieken met
        een eigen login (nu: Qore Aesthetics en de demo-kliniek).
      </p>
      {fout && <p className="mt-3 text-sm text-destructive">{fout}</p>}

      <div className="mt-5 flex flex-col gap-3">
        {widgets.map((w) => {
          const c = concepten[w.clinic_id];
          if (!c) return null;
          const zet = (deel: Partial<Concept>) =>
            setConcepten((oud) => ({ ...oud, [w.clinic_id]: { ...c, ...deel } }));
          const isOpen = open === w.clinic_id;
          return (
            <article
              key={w.clinic_id}
              className="rounded-2xl border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="h-5 w-5 rounded-full border border-border"
                  style={{ background: w.kleur }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{w.weergavenaam || w.clinics.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {w.is_actief ? "Aan" : "Uit"} · {w.domeinen.join(", ") || "nog geen website"} ·
                    max {w.max_per_dag} berichten/dag
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={hoofdknop} onClick={() => kopieer(w)}>
                    Kopieer de code
                  </button>
                  <button
                    type="button"
                    className={knop}
                    disabled={bezig === w.clinic_id}
                    onClick={() => testen(w)}
                  >
                    Staat hij op hun site?
                  </button>
                  <a
                    className={knop}
                    href={`/widget-voorbeeld?kliniek=${w.clinics.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Voorbeeld
                  </a>
                  <button
                    type="button"
                    className={knop}
                    onClick={() => setOpen(isOpen ? null : w.clinic_id)}
                  >
                    {isOpen ? "Sluiten" : "Aanpassen"}
                  </button>
                </div>
              </div>
              {melding[w.clinic_id] && (
                <p className="mt-3 break-all text-sm text-muted-foreground">
                  {melding[w.clinic_id]}
                </p>
              )}

              {isOpen && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Naam in de chat
                    <input
                      className={veld}
                      value={c.weergavenaam ?? ""}
                      onChange={(e) => zet({ weergavenaam: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Kleur
                    <span className="flex gap-2">
                      <input
                        type="color"
                        className="h-10 w-12 rounded-lg border border-input"
                        value={c.kleur}
                        onChange={(e) => zet({ kleur: e.target.value })}
                      />
                      <input
                        className={veld}
                        value={c.kleur}
                        onChange={(e) => zet({ kleur: e.target.value })}
                      />
                    </span>
                  </label>
                  <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                    Websites waar de widget mag staan (komma ertussen, www. hoeft niet)
                    <input
                      className={veld}
                      value={c.domeinen}
                      placeholder="kliniek.be, kliniek.nl"
                      onChange={(e) => zet({ domeinen: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                    Logo (https-link naar een vierkant beeld, leeg = eerste letter)
                    <input
                      className={veld}
                      value={c.logo_url ?? ""}
                      placeholder="https://"
                      onChange={(e) => zet({ logo_url: e.target.value })}
                    />
                  </label>
                  {(["nl", "fr", "en"] as const).map((t) => (
                    <label key={t} className="flex flex-col gap-1 text-sm sm:col-span-2">
                      Welkomsttekst {t.toUpperCase()} (leeg = standaardtekst)
                      <input
                        className={veld}
                        value={c[`welkom_${t}`] ?? ""}
                        onChange={(e) => zet({ [`welkom_${t}`]: e.target.value })}
                      />
                    </label>
                  ))}
                  <label className="flex flex-col gap-1 text-sm">
                    Kant van het scherm
                    <select
                      className={veld}
                      value={c.positie}
                      onChange={(e) => zet({ positie: e.target.value as Concept["positie"] })}
                    >
                      <option value="rechts">Rechts</option>
                      <option value="links">Links</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Maximum berichten per dag (veiligheid tegen misbruik)
                    <input
                      type="number"
                      min={1}
                      max={5000}
                      className={veld}
                      value={c.max_per_dag}
                      onChange={(e) => zet({ max_per_dag: Number(e.target.value) })}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={c.is_actief}
                      onChange={(e) => zet({ is_actief: e.target.checked })}
                    />
                    Widget staat aan (uit = verdwijnt binnen 5 minuten van de site, de code mag
                    blijven staan)
                  </label>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      className={hoofdknop}
                      disabled={bezig === w.clinic_id}
                      onClick={() => bewaren(c)}
                    >
                      {bezig === w.clinic_id ? "Bezig…" : "Bewaren"}
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {zonderWidget.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <select
            className={`${veld} max-w-xs`}
            value={nieuw}
            onChange={(e) => setNieuw(e.target.value)}
          >
            <option value="">Widget toevoegen voor…</option>
            {zonderWidget.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={knop}
            disabled={!nieuw || bezig !== null}
            onClick={toevoegen}
          >
            Toevoegen
          </button>
        </div>
      )}
    </section>
  );
}
