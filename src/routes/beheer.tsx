import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/beheer")({
  head: () => ({
    meta: [
      { title: "QoreLabs beheer" },
      { name: "description", content: "Overzicht van de klinieken en hun intake." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BeheerPagina,
});

const INTAKE_URL = "https://qorelabs.app.n8n.cloud/webhook/qore-intake";
const VOORBEREIDEN_URL = "https://qorelabs.app.n8n.cloud/webhook/qore-intake-voorbereiden";
const SLEUTEL_OPSLAG = "qore-beheercode";

type Status = "concept" | "verstuurd" | "ingevuld" | "gebouwd" | "live";

type Kliniek = {
  code: string;
  clinic_naam: string | null;
  website: string | null;
  status: Status;
  updated_at: string;
};

const STATUSSEN: { waarde: Status; naam: string; uitleg: string; kleur: string }[] = [
  { waarde: "concept", naam: "Concept klaar", uitleg: "Voorbereid, nog niet verstuurd", kleur: "bg-secondary text-muted-foreground" },
  { waarde: "verstuurd", naam: "Verstuurd", uitleg: "De kliniek heeft de link", kleur: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { waarde: "ingevuld", naam: "Ingevuld", uitleg: "De kliniek is klaar, jij bent aan zet", kleur: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { waarde: "gebouwd", naam: "Gebouwd", uitleg: "De chatbot staat klaar om te testen", kleur: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  { waarde: "live", naam: "Live", uitleg: "In gebruik bij de kliniek", kleur: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
];

const statusInfo = (s: Status) => STATUSSEN.find((x) => x.waarde === s) ?? STATUSSEN[0];

const intakeLink = (code: string) => `https://qorelabs.io/intake/${code}`;

const maakCode = (naam: string) => {
  const kern = naam
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const letters = "abcdefghijkmnpqrstuvwxyz23456789";
  let staart = "";
  for (let i = 0; i < 5; i++) staart += letters[Math.floor(Math.random() * letters.length)];
  return `${kern || "kliniek"}-${staart}`;
};

const berichtWhatsapp = (k: Kliniek) =>
  [
    `Hallo, zoals besproken stuur ik de vragenlijst voor de AI-receptionist van ${k.clinic_naam || "uw kliniek"}.`,
    "",
    "We hebben hem alvast zo ver mogelijk ingevuld met de informatie van uw website, dus u hoeft vooral na te kijken en aan te vullen.",
    "Invullen duurt ongeveer 30 minuten. U kunt tussendoor stoppen: uw antwoorden blijven bewaard en u gaat later verder via dezelfde link.",
    "",
    intakeLink(k.code),
    "",
    "Weet u iets niet zeker, laat het dan open. Wij vullen niets zelf in en de AI verzint nooit iets.",
  ].join("\n");

const berichtEmail = (k: Kliniek) =>
  [
    `Onderwerp: Vragenlijst AI-receptionist ${k.clinic_naam || ""}`.trim(),
    "",
    "Beste,",
    "",
    `Zoals besproken vindt u hieronder de vragenlijst voor de AI-receptionist van ${k.clinic_naam || "uw kliniek"}.`,
    "We hebben hem alvast zo ver mogelijk ingevuld met de informatie van uw website, dus u hoeft vooral na te kijken en aan te vullen.",
    "",
    `Uw link: ${intakeLink(k.code)}`,
    "",
    "Invullen duurt ongeveer 30 minuten. U kunt tussendoor stoppen: uw antwoorden blijven bewaard en u gaat later verder via dezelfde link.",
    "Weet u iets niet zeker, laat het dan open. Wij vullen niets zelf in en de AI verzint nooit iets.",
    "",
    "Met vriendelijke groet,",
    "QoreLabs",
  ].join("\n");

function Knop({
  children,
  klik,
  soort = "gewoon",
  uit = false,
}: {
  children: React.ReactNode;
  klik: () => void;
  soort?: "gewoon" | "hoofd";
  uit?: boolean;
}) {
  const basis = "rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50";
  const stijl =
    soort === "hoofd"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "border border-border text-foreground hover:border-primary";
  return (
    <button type="button" onClick={klik} disabled={uit} className={`${basis} ${stijl}`}>
      {children}
    </button>
  );
}

function Invoer({
  label,
  waarde,
  zet,
  plaats,
  type = "text",
}: {
  label: string;
  waarde: string;
  zet: (v: string) => void;
  plaats?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        value={waarde}
        placeholder={plaats}
        onChange={(e) => zet(e.target.value)}
        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none ring-ring transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2"
      />
    </label>
  );
}

function BeheerPagina() {
  const [sleutel, setSleutel] = useState("");
  const [ingelogd, setIngelogd] = useState(false);
  const [invoerSleutel, setInvoerSleutel] = useState("");
  const [klinieken, setKlinieken] = useState<Kliniek[]>([]);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  const [handmatig, setHandmatig] = useState<{ wat: string; tekst: string } | null>(null);

  const [nieuwNaam, setNieuwNaam] = useState("");
  const [nieuwWebsite, setNieuwWebsite] = useState("");
  const [bezig, setBezig] = useState(false);

  const ophalen = useCallback(async (code: string) => {
    setLaden(true);
    setFout(null);
    try {
      const antwoord = await fetch(`${INTAKE_URL}?lijst=1&sleutel=${encodeURIComponent(code)}`);
      if (antwoord.status === 403) {
        setIngelogd(false);
        setFout("Die beheercode klopt niet.");
        return;
      }
      if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
      const gegevens = await antwoord.json();
      // Geen lijst terug betekent geen toegang, dus laten we de pagina dicht.
      if (!Array.isArray(gegevens?.klinieken)) {
        setIngelogd(false);
        setFout("Die beheercode klopt niet.");
        return;
      }
      setKlinieken(gegevens.klinieken);
      setIngelogd(true);
    } catch {
      setFout("De lijst laden lukte niet. Probeer het zo nog eens.");
    } finally {
      setLaden(false);
    }
  }, []);

  useEffect(() => {
    let bewaard = "";
    try {
      bewaard = localStorage.getItem(SLEUTEL_OPSLAG) ?? "";
    } catch {
      // Privévenster: dan typt u de code gewoon opnieuw.
    }
    if (bewaard) {
      setSleutel(bewaard);
      ophalen(bewaard);
    }
  }, [ophalen]);

  const aanmelden = async () => {
    const code = invoerSleutel.trim();
    if (!code) return;
    setSleutel(code);
    try {
      localStorage.setItem(SLEUTEL_OPSLAG, code);
    } catch {
      // Niet kunnen bewaren is geen probleem, u typt hem dan opnieuw.
    }
    await ophalen(code);
  };

  const afmelden = () => {
    try {
      localStorage.removeItem(SLEUTEL_OPSLAG);
    } catch {
      // Niets te verwijderen.
    }
    setSleutel("");
    setInvoerSleutel("");
    setIngelogd(false);
    setKlinieken([]);
  };

  // Sommige browsers weigeren het klembord. Dan tonen we de tekst zodat u hem zelf kunt kopiëren.
  const kopieer = async (tekst: string, wat: string) => {
    try {
      await navigator.clipboard.writeText(tekst);
      setMelding(`${wat} gekopieerd`);
      setTimeout(() => setMelding(null), 2500);
      return;
    } catch {
      // Verder met de noodoplossing hieronder.
    }
    setHandmatig({ wat, tekst });
  };

  const statusZetten = async (k: Kliniek, nieuw: Status) => {
    setKlinieken((lijst) => lijst.map((x) => (x.code === k.code ? { ...x, status: nieuw } : x)));
    try {
      const antwoord = await fetch(INTAKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: k.code, status: nieuw }),
      });
      if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
    } catch {
      setFout("De status bewaren lukte niet. Ververs de pagina om te zien wat er wel bewaard is.");
    }
  };

  const nieuweKliniek = async (metAi: boolean) => {
    const naam = nieuwNaam.trim();
    if (!naam) {
      setFout("Vul eerst de naam van de kliniek in.");
      return;
    }
    if (metAi && !nieuwWebsite.trim()) {
      setFout("Voor voorbereiden met AI is een website nodig.");
      return;
    }
    setBezig(true);
    setFout(null);
    const code = maakCode(naam);
    try {
      if (metAi) {
        const antwoord = await fetch(VOORBEREIDEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, naam, website: nieuwWebsite.trim() }),
        });
        if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
        setMelding("Voorbereid. Kijk het concept na voor u de link verstuurt.");
      } else {
        const antwoord = await fetch(INTAKE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, naam, website: nieuwWebsite.trim(), status: "concept" }),
        });
        if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
        setMelding("Leeg formulier aangemaakt.");
      }
      setNieuwNaam("");
      setNieuwWebsite("");
      await ophalen(sleutel);
    } catch {
      setFout(
        metAi
          ? "Voorbereiden lukte niet. De website is misschien niet bereikbaar. Maak anders een leeg formulier aan."
          : "Aanmaken lukte niet. Probeer het zo nog eens.",
      );
    } finally {
      setBezig(false);
      setTimeout(() => setMelding(null), 4000);
    }
  };

  if (!ingelogd) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-16">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">QoreLabs beheer</span>
          <h1 className="font-display text-2xl font-semibold text-foreground">Uw klinieken</h1>
          <p className="text-sm text-muted-foreground">
            Vul uw beheercode in. Die staat in n8n en blijft op dit apparaat bewaard, zodat u hem maar één keer hoeft te typen.
          </p>
        </div>
        <Invoer label="Beheercode" waarde={invoerSleutel} zet={setInvoerSleutel} type="password" />
        {fout && <p className="text-sm text-destructive">{fout}</p>}
        <Knop soort="hoofd" klik={aanmelden} uit={laden}>
          {laden ? "Even kijken…" : "Openen"}
        </Knop>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-10">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">QoreLabs beheer</span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Uw klinieken</h1>
          <p className="text-sm text-muted-foreground">
            Hier maakt u een nieuwe kliniek aan, kijkt u het concept na en kopieert u de link met het bericht.
          </p>
        </div>
        <button type="button" onClick={afmelden} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
          Afsluiten
        </button>
      </header>

      <section className="mb-7 rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Nieuwe kliniek</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Invoer label="Naam van de kliniek" waarde={nieuwNaam} zet={setNieuwNaam} plaats="Kliniek ABC" />
          <Invoer label="Website" waarde={nieuwWebsite} zet={setNieuwWebsite} plaats="https://" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Met AI voorbereiden leest de website uit en vult het formulier alvast in. Dat duurt ongeveer een minuut. Daarna kijkt u het na.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Knop soort="hoofd" klik={() => nieuweKliniek(true)} uit={bezig}>
            {bezig ? "Bezig…" : "Voorbereiden met AI"}
          </Knop>
          <Knop klik={() => nieuweKliniek(false)} uit={bezig}>
            Leeg formulier aanmaken
          </Knop>
        </div>
      </section>

      {handmatig && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">{handmatig.wat} — selecteer en kopieer zelf</span>
            <button
              type="button"
              onClick={() => setHandmatig(null)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Sluiten
            </button>
          </div>
          <textarea
            readOnly
            rows={handmatig.tekst.split("\n").length + 1}
            value={handmatig.tekst}
            onFocus={(e) => e.currentTarget.select()}
            autoFocus
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none"
          />
        </div>
      )}

      {melding && (
        <p className="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-foreground">{melding}</p>
      )}
      {fout && (
        <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{fout}</p>
      )}

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Overzicht</h2>
        <button
          type="button"
          onClick={() => ophalen(sleutel)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {laden ? "Verversen…" : "Verversen"}
        </button>
      </div>

      {klinieken.length === 0 && !laden && (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nog geen klinieken. Maak er hierboven een aan.
        </p>
      )}

      <div className="grid gap-3">
        {klinieken.map((k) => {
          const info = statusInfo(k.status);
          return (
            <article key={k.code} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="font-medium text-foreground">{k.clinic_naam || k.code}</h3>
                  <p className="text-xs text-muted-foreground">
                    {k.website ? `${k.website} · ` : ""}
                    bijgewerkt {new Date(k.updated_at).toLocaleString("nl-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${info.kleur}`} title={info.uitleg}>
                  {info.naam}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`/intake/${k.code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary"
                >
                  Formulier openen
                </a>
                <Knop klik={() => kopieer(intakeLink(k.code), "Link")}>Link kopiëren</Knop>
                <Knop klik={() => kopieer(berichtWhatsapp(k), "WhatsApp-bericht")}>Bericht voor WhatsApp</Knop>
                <Knop klik={() => kopieer(berichtEmail(k), "E-mail")}>Bericht voor e-mail</Knop>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                {STATUSSEN.map((s) => (
                  <button
                    key={s.waarde}
                    type="button"
                    onClick={() => statusZetten(k, s.waarde)}
                    title={s.uitleg}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      k.status === s.waarde
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {s.naam}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
