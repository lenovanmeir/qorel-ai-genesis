import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import aestheticsCss from "../styles/aesthetics.css?url";

// Leno's own dashboard on qoreaesthetics.com/dashboard. This first version is a preview with
// sample numbers so Leno can approve the layout before it reads live data from n8n and Supabase.
export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Qore Aesthetics" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "theme-color", content: "#07070B" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Cormorant+Garamond:wght@300&display=swap",
      },
      { rel: "stylesheet", href: aestheticsCss },
    ],
  }),
  component: Dashboard,
});

type Tab = "vandaag" | "morgen" | "week" | "leads" | "demos" | "verbruik" | "klanten" | "betalingen";

const TABS: { id: Tab; label: string }[] = [
  { id: "vandaag", label: "Vandaag" },
  { id: "morgen", label: "Morgen" },
  { id: "week", label: "Deze week" },
  { id: "leads", label: "Leads" },
  { id: "demos", label: "Demo's" },
  { id: "klanten", label: "Klanten" },
  { id: "verbruik", label: "Verbruik" },
  { id: "betalingen", label: "Betalingen" },
];

type Fiche = {
  naam: string;
  stad: string;
  kans: number;
  waarom: string;
  status: string;
  instagram: string;
  volgers: string;
  laatstePost: string;
  bio: string;
  vragen: string[];
  demoVragen: string[];
  gesprek?: string;
};

// Sample data for the preview; the live version fills this from the sheet and Supabase.
const FICHES: Fiche[] = [
  {
    naam: "Kliniek Aurora",
    stad: "Antwerpen",
    kans: 94,
    waarom: "12 onbeantwoorde prijsvragen in comments, geen online boeking, post NL en FR",
    status: "Gesprek gepland",
    instagram: "@kliniek.aurora",
    volgers: "8.400",
    laatstePost: "gisteren",
    bio: "Laser & skin · DM voor een afspraak",
    vragen: ["“Prijs voor full legs?”", "“Doen jullie ook mannen?”", "“Info pls”"],
    demoVragen: [
      "Wat kost laserontharing?",
      "Zijn jullie open op zaterdag?",
      "Hoeveel sessies heb ik nodig?",
    ],
    gesprek: "vandaag 15:00 (jouw tijd 21:00)",
  },
  {
    naam: "Huidstudio Noord",
    stad: "Gent",
    kans: 88,
    waarom: "Antwoordde gisteren op je DM, vraagt naar prijzen",
    status: "Geantwoord",
    instagram: "@huidstudio.noord",
    volgers: "3.100",
    laatstePost: "3 dagen geleden",
    bio: "Huidverbetering · boek via link in bio",
    vragen: ["“Hoeveel kost microneedling?”"],
    demoVragen: [],
  },
  {
    naam: "Atelier Lumi",
    stad: "Antwerpen",
    kans: 81,
    waarom: "Demo verstuurd 3 dagen geleden, nog geen vraag gesteld",
    status: "Demo verstuurd",
    instagram: "@atelier.lumi",
    volgers: "5.900",
    laatstePost: "vandaag",
    bio: "Injectables & skin · Antwerpen",
    vragen: ["“Is er nog plaats deze week?”", "“Prijs botox?”"],
    demoVragen: [],
  },
];

function Dashboard() {
  const [tab, setTab] = useState<Tab>("vandaag");
  const [fiche, setFiche] = useState<Fiche | null>(null);

  return (
    <div className="qa">
      <div className="wrap dash">
        <nav className="top" aria-label="Dashboard">
          <span className="logo" aria-label="Qore Aesthetics">
            <span className="q" aria-hidden="true">
              Q
            </span>
            <span className="wm">
              QORE<small>DASHBOARD</small>
            </span>
          </span>
          <span className="dash-badge">Vandaag, morgen &amp; demo's: live · rest: voorbeeld</span>
        </nav>

        <div className="dash-tabs" role="tablist" aria-label="Onderdelen">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setFiche(null);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {fiche ? (
          <FicheView fiche={fiche} terug={() => setFiche(null)} />
        ) : (
          <>
            {tab === "vandaag" && <LiveVandaag dag="vandaag" />}
            {tab === "morgen" && <LiveVandaag dag="morgen" />}
            {tab === "week" && <Week />}
            {tab === "leads" && <Leads open={setFiche} />}
            {tab === "demos" && <Demos />}
            {tab === "klanten" && <Klanten />}
            {tab === "verbruik" && <Verbruik />}
            {tab === "betalingen" && <Betalingen />}
          </>
        )}
      </div>
    </div>
  );
}

function Cijfers({ items }: { items: [string, string, string?][] }) {
  return (
    <div className="dash-kpis">
      {items.map(([label, waarde, sub]) => (
        <div key={label} className="dash-kpi">
          <span>{label}</span>
          <b>{waarde}</b>
          {sub && <small>{sub}</small>}
        </div>
      ))}
    </div>
  );
}

// Live list for today, read from the Leads tab by n8n workflow "Dashboard vandaag (Leads)".
const VANDAAG_URL = "https://qorelabs.app.n8n.cloud/webhook/qa-dashboard-vandaag";
// Same lists straight from the database (Supabase Edge Function "dashboard"): faster and no n8n run per load.
const LIJST_URL = "https://gqigmmezcmtwusgbdxny.supabase.co/functions/v1/dashboard";

// Reads the list from the database; only if that fails for another reason than a wrong code, n8n answers instead.
async function haalLijst(code: string): Promise<Response> {
  try {
    const antwoord = await fetch(LIJST_URL, { headers: { "x-beheercode": code } });
    if (antwoord.ok || antwoord.status === 403) return antwoord;
  } catch {
    // Network or function trouble: fall back to n8n below.
  }
  return fetch(`${VANDAAG_URL}?sleutel=${encodeURIComponent(code)}`);
}
const ACTIE_URL = "https://qorelabs.app.n8n.cloud/webhook/qa-dashboard-actie";
const SLEUTEL_OPSLAG = "qore-beheercode";

type Taak = {
  rij: number;
  naam: string;
  stad: string;
  instagram: string;
  email: string;
  kanaal: string;
  status: string;
  datum: string;
  volgendeStap: string;
  versie: string;
  bericht?: string;
  reactie?: string;
  uitleg?: string;
  stap?: number;
  vraagknop?: string;
  minuten?: number;
};

type Lijst = {
  vandaag: string;
  sturen: Taak[];
  opwarmen: Taak[];
  opvolgen: Taak[];
  nakijken: Taak[];
  morgen?: { datum: string; sturen: Taak[]; opwarmen: Taak[]; opvolgen: Taak[] };
  vraagknopTikken?: Taak[];
  vraagknopWachten?: Taak[];
};

type Actie =
  | "verstuurd"
  | "opvolging1"
  | "opvolging2"
  | "geantwoord"
  | "vraagknop_heeft"
  | "vraagknop_geenknop"
  | "vraagknop_getikt"
  | "vraagknop_geen"
  | "vraagknop_wel"
  | "naar_morgen";

// Leno first marks everything, then sends one block at once: one n8n run instead of one per click.
type Keuze = { rij: number; actie: Actie; tijd: string };
const KEUZE_OPSLAG = "qore-keuzes";

// Marks on the same row only conflict within a group (one status, one question-button step, one date move).
// "Keuzeknop" (seen) and "Getikt" (tapped) are separate groups so both can be marked on the same clinic.
function groep(actie: Actie) {
  if (actie === "vraagknop_heeft" || actie === "vraagknop_geenknop") return "zien";
  if (actie.startsWith("vraagknop_")) return "knop";
  if (actie === "naar_morgen") return "datum";
  return "status";
}

function leesKeuzes(): Record<string, Keuze> {
  try {
    return JSON.parse(localStorage.getItem(KEUZE_OPSLAG) ?? "{}") as Record<string, Keuze>;
  } catch {
    return {};
  }
}

function bewaarKeuzes(keuzes: Record<string, Keuze>) {
  try {
    localStorage.setItem(KEUZE_OPSLAG, JSON.stringify(keuzes));
  } catch {
    // Without storage the marks only live until the page is closed.
  }
}

// Instagram's suggested-question buttons only show in the phone app, so Leno taps them; after 2,5 hours
// without an answer the pain point goes into that clinic's DM.
const VRAAGKNOP_WACHTTIJD = 150;

// "dd/mm/yy" -> sortable number; unknown dates sort last.
function datumWaarde(s: string | undefined) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})/.exec(String(s ?? "").trim());
  return m ? Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]) : 999999;
}

// Oldest date first, then sheet order: clinics that have waited longest come first.
function oudsteEerst(a: Taak, b: Taak) {
  return datumWaarde(a.datum) - datumWaarde(b.datum) || a.rij - b.rij;
}

function leesSleutel() {
  try {
    return localStorage.getItem(SLEUTEL_OPSLAG) ?? "";
  } catch {
    return "";
  }
}

function bewaarSleutel(waarde: string) {
  try {
    localStorage.setItem(SLEUTEL_OPSLAG, waarde);
  } catch {
    // Storage can be blocked; the code then has to be typed again next time.
  }
}

// A mail message starts with "Onderwerp: ..." on its first line; split it for the mailto link.
function mailLink(taak: Taak) {
  const tekst = taak.bericht ?? "";
  const m = tekst.match(/^Onderwerp: (.*)\n\n([\s\S]*)$/);
  const onderwerp = m ? m[1] : "";
  const inhoud = m ? m[2] : tekst;
  return `mailto:${taak.email}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(inhoud)}`;
}

function LiveVandaag({ dag }: { dag: "vandaag" | "morgen" }) {
  const [sleutel, setSleutel] = useState("");
  const [invoer, setInvoer] = useState("");
  const [lijst, setLijst] = useState<Lijst | null>(null);
  const [fout, setFout] = useState("");
  const [laden, setLaden] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [keuzes, setKeuzes] = useState<Record<string, Keuze>>({});
  const [gekopieerd, setGekopieerd] = useState<number | null>(null);

  async function ophalen(code: string) {
    setLaden(true);
    setFout("");
    try {
      const antwoord = await haalLijst(code);
      if (antwoord.status === 403) {
        setFout("Die beheercode klopt niet.");
        setSleutel("");
        return;
      }
      if (!antwoord.ok) throw new Error();
      const data = (await antwoord.json()) as Lijst;
      for (const l of [data.sturen, data.opvolgen, data.vraagknopTikken, data.vraagknopWachten])
        l?.sort(oudsteEerst);
      setLijst(data);
      setSleutel(code);
      bewaarSleutel(code);
    } catch {
      setFout("De lijst kon niet geladen worden. Probeer het zo opnieuw.");
    } finally {
      setLaden(false);
    }
  }

  // A home-screen app or shortcut may not keep localStorage, so the code can also come in the
  // link as #code=... (the part after # never reaches a server). It is removed from the address bar.
  useEffect(() => {
    const uitLink = new URLSearchParams(window.location.hash.slice(1)).get("code") ?? "";
    if (uitLink) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const code = uitLink || leesSleutel();
    if (code) void ophalen(code);
  }, []);

  useEffect(() => {
    setKeuzes(leesKeuzes());
  }, []);

  // Warn before leaving the page while marks have not been sent yet.
  useEffect(() => {
    if (Object.keys(keuzes).length === 0) return;
    const waarschuw = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", waarschuw);
    return () => window.removeEventListener("beforeunload", waarschuw);
  }, [keuzes]);

  function zetKeuzes(nieuw: Record<string, Keuze>) {
    setKeuzes(nieuw);
    bewaarKeuzes(nieuw);
  }

  function isGekozen(rij: number, actie: Actie) {
    return keuzes[`${rij}:${groep(actie)}`]?.actie === actie;
  }

  // A first click marks the action, a second click on the same button undoes it.
  function kies(taak: Taak, actie: Actie) {
    const sleutelKeuze = `${taak.rij}:${groep(actie)}`;
    const nieuw = { ...keuzes };
    if (nieuw[sleutelKeuze]?.actie === actie) delete nieuw[sleutelKeuze];
    else {
      nieuw[sleutelKeuze] = { rij: taak.rij, actie, tijd: new Date().toISOString() };
      // "Geen keuzeknop" and "Getikt" contradict each other: the last tap wins.
      if (actie === "vraagknop_geenknop" && nieuw[`${taak.rij}:knop`]?.actie === "vraagknop_getikt")
        delete nieuw[`${taak.rij}:knop`];
      if (actie === "vraagknop_getikt" && nieuw[`${taak.rij}:zien`]?.actie === "vraagknop_geenknop")
        delete nieuw[`${taak.rij}:zien`];
    }
    zetKeuzes(nieuw);
  }

  function keuzesVoor(rijen: number[]) {
    return Object.entries(keuzes).filter(([, k]) => rijen.includes(k.rij));
  }

  // Sends all marks of one block in a single request.
  async function verstuur(rijen: number[]) {
    const lijstKeuzes = keuzesVoor(rijen);
    if (lijstKeuzes.length === 0) return;
    // A tap already proves the clinic has buttons, so "Keuzeknop" is not sent next to "Getikt"
    // (both write column AA and the tap time must stay).
    const getikt = new Set(
      lijstKeuzes.filter(([, k]) => k.actie === "vraagknop_getikt").map(([, k]) => k.rij),
    );
    const acties = lijstKeuzes
      .map(([, k]) => k)
      .filter((k) => !(k.actie === "vraagknop_heeft" && getikt.has(k.rij)));
    setBezig(true);
    setFout("");
    try {
      const antwoord = await fetch(ACTIE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sleutel, acties }),
      });
      if (!antwoord.ok) throw new Error();
      const nieuw = { ...keuzes };
      lijstKeuzes.forEach(([k]) => delete nieuw[k]);
      zetKeuzes(nieuw);
      await ophalen(sleutel);
    } catch {
      setFout("Versturen lukte niet. Je keuzes staan er nog; probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  // Marks every question-button test older than 2,5 hours as unanswered (still to be sent).
  function allesGeenAntwoord() {
    const nieuw = { ...keuzes };
    (lijst?.vraagknopWachten ?? [])
      .filter((t) => (t.minuten ?? 0) >= VRAAGKNOP_WACHTTIJD)
      .forEach((t) => {
        nieuw[`${t.rij}:knop`] = {
          rij: t.rij,
          actie: "vraagknop_geen",
          tijd: new Date().toISOString(),
        };
      });
    zetKeuzes(nieuw);
  }

  async function kopieer(taak: Taak) {
    try {
      await navigator.clipboard.writeText(taak.bericht ?? "");
      setGekopieerd(taak.rij);
      setTimeout(() => setGekopieerd(null), 2000);
    } catch {
      setFout("Kopiëren lukte niet. Selecteer de tekst en kopieer hem zelf.");
    }
  }

  if (!sleutel) {
    return (
      <section className="dash-section">
        <form
          className="dash-card dash-key"
          onSubmit={(e) => {
            e.preventDefault();
            if (invoer.trim()) void ophalen(invoer.trim());
          }}
        >
          <h2>{dag === "morgen" ? "Morgen" : "Vandaag"}</h2>
          <p className="dash-note">Vul je beheercode in. Hij blijft op dit toestel bewaard.</p>
          <div className="dash-actions">
            <input
              type="password"
              value={invoer}
              onChange={(e) => setInvoer(e.target.value)}
              placeholder="Beheercode"
              aria-label="Beheercode"
              autoComplete="current-password"
            />
            <button type="submit" className="dash-btn primary" disabled={laden}>
              {laden ? "Laden…" : "Openen"}
            </button>
          </div>
          {fout && <p className="dash-error">{fout}</p>}
        </form>
      </section>
    );
  }

  if (!lijst) {
    return (
      <section className="dash-section">
        <p className="dash-note">{fout || "Lijst van vandaag laden…"}</p>
      </section>
    );
  }

  const morgen = dag === "morgen";
  // Tomorrow is a preview: same lists, no buttons that change the sheet.
  const deel = morgen
    ? (lijst.morgen ?? { datum: "", sturen: [], opwarmen: [], opvolgen: [] })
    : lijst;
  const woord = morgen ? "Morgen" : "Vandaag";
  // Button tests for clinics that get their DM today, and for clinics Claude warmed up for tomorrow.
  const vandaagWaarde = datumWaarde(lijst.vandaag);
  const tikNu = (lijst.vraagknopTikken ?? []).filter((t) => datumWaarde(t.datum) <= vandaagWaarde);
  const opgewarmd = (lijst.vraagknopTikken ?? []).filter(
    (t) => datumWaarde(t.datum) > vandaagWaarde,
  );

  const tikRij = (t: Taak, metNaarMorgen: boolean) => (
    <li key={`tik-${t.rij}`}>
      <span>
        <b>
          {t.naam} <small className="dash-rij">rij {t.rij}</small>
        </b>
        <small>
          {t.vraagknop?.startsWith("Heeft")
            ? "Heeft keuzeknoppen: tik op één vraag"
            : "Nog te bekijken"}
        </small>
      </span>
      <span className="dash-actions">
        {t.instagram && (
          <a className="dash-btn" href={t.instagram} target="_blank" rel="noreferrer">
            Open Instagram
          </a>
        )}
        {/* Always shown; already lit when the sheet says the clinic has buttons. */}
        <KeuzeKnop
          gekozen={isGekozen(t.rij, "vraagknop_heeft") || Boolean(t.vraagknop?.startsWith("Heeft"))}
          onClick={() => kies(t, "vraagknop_heeft")}
        >
          Keuzeknop
        </KeuzeKnop>
        <KeuzeKnop
          gekozen={isGekozen(t.rij, "vraagknop_geenknop")}
          onClick={() => kies(t, "vraagknop_geenknop")}
        >
          Geen keuzeknop
        </KeuzeKnop>
        <KeuzeKnop
          gekozen={isGekozen(t.rij, "vraagknop_getikt")}
          onClick={() => kies(t, "vraagknop_getikt")}
        >
          Getikt ✓
        </KeuzeKnop>
        {metNaarMorgen && (
          <KeuzeKnop
            gekozen={isGekozen(t.rij, "naar_morgen")}
            onClick={() => kies(t, "naar_morgen")}
          >
            Naar morgen
          </KeuzeKnop>
        )}
      </span>
    </li>
  );

  return (
    <section className="dash-section">
      <Cijfers
        items={[
          [`${woord} versturen`, String(deel.sturen.length), "van boven naar beneden"],
          ["Opvolgen", String(deel.opvolgen.length), "geen antwoord gekregen"],
          ["Opwarmen", String(deel.opwarmen.length), "doet Claude, verspreid over de dag"],
          ...(morgen
            ? []
            : [
                ["Nakijken", String(lijst.nakijken.length), "eerst iets uitzoeken"] as [
                  string,
                  string,
                  string,
                ],
              ]),
        ]}
      />
      {fout && <p className="dash-error">{fout}</p>}

      {/* Jump links, so the send list is one tap away even when the button-test list is long. */}
      {!morgen && (
        <nav className="dash-jump" aria-label="Spring naar">
          {(tikNu.length > 0 || (lijst.vraagknopWachten?.length ?? 0) > 0) && (
            <a className="dash-btn" href="#dash-blok-knoppen">
              Knoppen testen ({tikNu.length + (lijst.vraagknopWachten?.length ?? 0)})
            </a>
          )}
          <a className="dash-btn primary" href="#dash-blok-versturen">
            Versturen ({deel.sturen.length})
          </a>
          {opgewarmd.length > 0 && (
            <a className="dash-btn" href="#dash-blok-opgewarmd">
              Opgewarmd ({opgewarmd.length})
            </a>
          )}
          {deel.opvolgen.length > 0 && (
            <a className="dash-btn" href="#dash-blok-opvolgen">
              Opvolgen ({deel.opvolgen.length})
            </a>
          )}
        </nav>
      )}

      {!morgen && (tikNu.length > 0 || (lijst.vraagknopWachten?.length ?? 0) > 0) && (
        <div className="dash-card" id="dash-blok-knoppen">
          <div className="dash-card-head">
            <h2>Vraagknoppen testen (op je telefoon)</h2>
            {(lijst.vraagknopWachten ?? []).some(
              (t) => (t.minuten ?? 0) >= VRAAGKNOP_WACHTTIJD,
            ) && (
              <button type="button" className="dash-btn primary" onClick={allesGeenAntwoord}>
                Alles: geen antwoord
              </button>
            )}
          </div>
          <p className="dash-note">
            Open de chat in de Instagram-app. Geen keuzeknoppen? Klik op &quot;Geen keuzeknop&quot;.
            Wel? Tik op één voorgestelde vraag en klik op &quot;Getikt ✓&quot;. Krijg je na 2,5 uur
            geen antwoord, dan komt dat pijnpunt automatisch in hun DM. Wat je aanduidt, gaat pas
            weg als je onderaan op Versturen tikt.
          </p>
          <ul className="dash-list plain">
            {tikNu.map((t) => tikRij(t, true))}
            {(lijst.vraagknopWachten ?? []).map((t) => {
              const klaar = (t.minuten ?? 0) >= VRAAGKNOP_WACHTTIJD;
              return (
                <li key={`wacht-${t.rij}`}>
                  <span>
                    <b>
                      {t.naam} <small className="dash-rij">rij {t.rij}</small>
                    </b>
                    <small>
                      {klaar
                        ? `Getikt ${String(Math.round((t.minuten ?? 0) / 6) / 10).replace(".", ",")} uur geleden: kwam er een antwoord?`
                        : `Getikt, nog ${VRAAGKNOP_WACHTTIJD - (t.minuten ?? 0)} minuten wachten`}
                    </small>
                  </span>
                  <span className="dash-actions">
                    {klaar && (
                      <KeuzeKnop
                        gekozen={isGekozen(t.rij, "vraagknop_geen")}
                        onClick={() => kies(t, "vraagknop_geen")}
                      >
                        Geen antwoord
                      </KeuzeKnop>
                    )}
                    <KeuzeKnop
                      gekozen={isGekozen(t.rij, "vraagknop_wel")}
                      onClick={() => kies(t, "vraagknop_wel")}
                    >
                      Wel antwoord
                    </KeuzeKnop>
                  </span>
                </li>
              );
            })}
          </ul>
          <Verstuurbalk
            aantal={
              keuzesVoor([...tikNu, ...(lijst.vraagknopWachten ?? [])].map((t) => t.rij)).length
            }
            bezig={bezig}
            onClick={() =>
              void verstuur([...tikNu, ...(lijst.vraagknopWachten ?? [])].map((t) => t.rij))
            }
          />
        </div>
      )}

      <div className="dash-card" id="dash-blok-versturen">
        <div className="dash-card-head">
          <h2>{woord} versturen</h2>
          <button
            type="button"
            className="dash-btn"
            onClick={() => void ophalen(sleutel)}
            disabled={laden}
          >
            {laden ? "Laden…" : "Vernieuwen"}
          </button>
        </div>
        {deel.sturen.length === 0 && (
          <p className="dash-note">
            {morgen ? "Morgen staat er niets klaar." : "Niets meer te versturen vandaag."}
          </p>
        )}
        <ul className="dash-list">
          {deel.sturen.map((t) => (
            <TaakKaart
              key={t.rij}
              taak={t}
              gekozen={(a) => isGekozen(t.rij, a)}
              gekopieerd={gekopieerd === t.rij}
              kopieer={() => void kopieer(t)}
              acties={
                morgen
                  ? []
                  : [
                      ["verstuurd", "Verstuurd ✓"],
                      ["naar_morgen", "Naar morgen"],
                    ]
              }
              kies={(a) => kies(t, a)}
            />
          ))}
        </ul>
        {!morgen && (
          <Verstuurbalk
            aantal={keuzesVoor(deel.sturen.map((t) => t.rij)).length}
            bezig={bezig}
            onClick={() => void verstuur(deel.sturen.map((t) => t.rij))}
          />
        )}
      </div>

      {deel.opvolgen.length > 0 && (
        <div className="dash-card" id="dash-blok-opvolgen">
          <h2>Opvolgen</h2>
          <ul className="dash-list">
            {deel.opvolgen.map((t) => (
              <TaakKaart
                key={t.rij}
                taak={t}
                gekozen={(a) => isGekozen(t.rij, a)}
                gekopieerd={gekopieerd === t.rij}
                kopieer={() => void kopieer(t)}
                acties={
                  morgen
                    ? []
                    : [
                        [
                          t.stap === 2 ? "opvolging2" : "opvolging1",
                          `Opvolging ${t.stap ?? 1} verstuurd ✓`,
                        ],
                        ["geantwoord", "Ze hebben geantwoord"],
                      ]
                }
                kies={(a) => kies(t, a)}
              />
            ))}
          </ul>
          {!morgen && (
            <Verstuurbalk
              aantal={keuzesVoor(deel.opvolgen.map((t) => t.rij)).length}
              bezig={bezig}
              onClick={() => void verstuur(deel.opvolgen.map((t) => t.rij))}
            />
          )}
        </div>
      )}

      {!morgen && opgewarmd.length > 0 && (
        <div className="dash-card" id="dash-blok-opgewarmd">
          <h2>Opgewarmd door Claude: morgen sturen</h2>
          <p className="dash-note">
            Claude heeft deze klinieken geliket en een reactie gegeven. Open ze in de Instagram-app,
            volg ze en kijk of ze keuzeknoppen hebben. Wel? Tik op één vraag en duid &quot;Getikt
            ✓&quot; aan. Morgen kijkt Claude of ze antwoordden en zet hij zelf de PS in hun DM,
            zodat jij alleen nog moet versturen.
          </p>
          <ul className="dash-list plain">{opgewarmd.map((t) => tikRij(t, false))}</ul>
          <Verstuurbalk
            aantal={keuzesVoor(opgewarmd.map((t) => t.rij)).length}
            bezig={bezig}
            onClick={() => void verstuur(opgewarmd.map((t) => t.rij))}
          />
        </div>
      )}

      <div className="dash-grid">
        <div className="dash-card">
          <h2>Opwarmen (doet Claude)</h2>
          {deel.opwarmen.length === 0 && <p className="dash-note">Niets op te warmen.</p>}
          <ul className="dash-list plain">
            {deel.opwarmen.map((t) => (
              <li key={t.rij}>
                <span>
                  <b>
                    {t.naam} <small className="dash-rij">rij {t.rij}</small>
                  </b>
                  <small>Reactie: {t.reactie}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
        {!morgen && (
          <div className="dash-card">
            <h2>Nakijken</h2>
            {lijst.nakijken.length === 0 && <p className="dash-note">Niets na te kijken.</p>}
            <ul className="dash-list plain">
              {lijst.nakijken.map((t) => (
                <li key={t.rij}>
                  <span>
                    <b>
                      {t.naam} <small className="dash-rij">rij {t.rij}</small>
                    </b>
                    <small>{t.volgendeStap}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

// A button that only marks a choice; a ring shows it is marked and a second tap undoes it.
function KeuzeKnop({
  gekozen,
  onClick,
  children,
}: {
  gekozen: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`dash-btn${gekozen ? " gekozen" : ""}`}
      aria-pressed={gekozen}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Verstuurbalk({
  aantal,
  bezig,
  onClick,
}: {
  aantal: number;
  bezig: boolean;
  onClick: () => void;
}) {
  return (
    <div className="dash-save">
      <small>
        {aantal === 0
          ? "Duid aan wat je gedaan hebt en verstuur alles in één keer."
          : `${aantal} aangeduid, nog niet verstuurd. Tik nog eens op een knop om het ongedaan te maken.`}
      </small>
      <button
        type="button"
        className="dash-btn primary"
        disabled={aantal === 0 || bezig}
        onClick={onClick}
      >
        {bezig ? "Versturen…" : `Versturen (${aantal})`}
      </button>
    </div>
  );
}

function TaakKaart({
  taak,
  gekozen,
  gekopieerd,
  kopieer,
  acties,
  kies,
}: {
  taak: Taak;
  gekozen: (a: Actie) => boolean;
  gekopieerd: boolean;
  kopieer: () => void;
  acties: [Actie, string][];
  kies: (a: Actie) => void;
}) {
  const isMail = taak.kanaal === "E-mail";
  return (
    <li className="dash-task">
      <div className="dash-task-head">
        <span>
          <b>
            {taak.naam} <small className="dash-rij">rij {taak.rij}</small>
          </b>
          <small>{taak.volgendeStap}</small>
        </span>
        <em className={`dash-pill ${isMail ? "warn" : "accent"}`}>
          {isMail ? "Mail" : "Instagram"}
        </em>
      </div>
      {taak.vraagknop && <p className="dash-note">Vraagknop: {taak.vraagknop}</p>}
      <p className="dash-msg">{taak.bericht}</p>
      <div className="dash-actions">
        {isMail ? (
          <>
            <button type="button" className="dash-btn" onClick={kopieer}>
              {gekopieerd ? "Gekopieerd" : "Kopieer bericht"}
            </button>
            <a className="dash-btn" href={mailLink(taak)}>
              Open in mail
            </a>
          </>
        ) : (
          // One tap copies the message and opens the clinic's Instagram, so Leno only has to paste.
          taak.instagram && (
            <a
              className="dash-btn"
              href={taak.instagram}
              target="_blank"
              rel="noreferrer"
              onClick={kopieer}
            >
              {gekopieerd ? "Gekopieerd ✓ plak in Instagram" : "Kopieer & open Instagram"}
            </a>
          )
        )}
        {acties.map(([actie, label]) => (
          <KeuzeKnop key={actie} gekozen={gekozen(actie)} onClick={() => kies(actie)}>
            {label}
          </KeuzeKnop>
        ))}
      </div>
    </li>
  );
}

function Week() {
  const stappen: [string, number][] = [
    ["DM's verstuurd", 94],
    ["Gelezen", 71],
    ["Geantwoord", 14],
    ["Demo verstuurd", 6],
    ["Demo gebruikt", 4],
    ["Gesprek", 2],
    ["Klant", 1],
  ];
  return (
    <section className="dash-section">
      <Cijfers
        items={[
          ["Reply rate", "14,9%", "+2,1% t.o.v. vorige week"],
          ["Demo → gesprek", "33%", "2 van 6"],
          ["Nieuwe klanten", "1", "Kliniek Aurora"],
          ["Omzet deze maand", "€ 297", "1 betaling"],
        ]}
      />
      <div className="dash-card">
        <h2>Van DM tot klant, deze week</h2>
        <div className="dash-funnel">
          {stappen.map(([label, n]) => (
            <div key={label} className="dash-funnel-row">
              <span>{label}</span>
              <div className="dash-bar">
                <i style={{ width: `${(n / stappen[0][1]) * 100}%` }} />
              </div>
              <b>{n}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Leads({ open }: { open: (f: Fiche) => void }) {
  return (
    <section className="dash-section">
      <div className="dash-card">
        <h2>Beste kansen</h2>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Kliniek</th>
              <th>Stad</th>
              <th>Kans</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {FICHES.map((f) => (
              <tr key={f.naam} onClick={() => open(f)}>
                <td>{f.naam}</td>
                <td>{f.stad}</td>
                <td>
                  <span className="dash-score">{f.kans}</span>
                </td>
                <td>{f.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Live demos from Supabase demo_aanvragen, delivered in the same n8n answer as the list of today.
const DEMO_ACTIE_URL = "https://qorelabs.app.n8n.cloud/webhook/qa-dashboard-demo-actie";

type DemoVraag = { onderwerp: string; vraag: string; antwoord: string; goed: boolean };

type Demo = {
  id: string;
  kliniek: string;
  instagram: string;
  website: string;
  taal: string;
  status: string;
  fout: string;
  code: string;
  token: string;
  nakijk: string;
  verstuurd_op: string | null;
  verloopt_op: string | null;
  gebruikt: number;
  max: number;
  meer_tijd: string | null;
  dm_tekst: string;
  dm_verstuurd_op: string | null;
  controle: {
    ok: number;
    totaal: number;
    vragen?: DemoVraag[];
    paginas?: number;
    behandelingen?: number;
    metPrijs?: number;
    vestigingen?: number;
    adres?: boolean;
  } | null;
};

type DemoStaat = {
  label: string;
  soort: "ok" | "warn" | "accent" | "";
  uitleg: string;
  volgorde: number;
};

function demoStaat(d: Demo): DemoStaat {
  if (d.status === "mislukt" || d.status === "geen_website")
    return {
      label: "Mislukt",
      soort: "",
      uitleg: d.fout || "Geen website om te lezen.",
      volgorde: 5,
    };
  if (d.status === "bouwen")
    return { label: "Wordt gebouwd", soort: "", uitleg: "Even geduld.", volgorde: 4 };
  if (!d.verstuurd_op)
    return {
      label: "Nakijken",
      soort: "warn",
      uitleg:
        "Kijk na en druk op « Klaar – verstuur demo ». Pas dan werkt de link voor de kliniek.",
      volgorde: 1,
    };
  if (d.verloopt_op && Date.parse(d.verloopt_op) < Date.now())
    return {
      label: "Verlopen",
      soort: "",
      uitleg: `${d.gebruikt} van ${d.max} berichten gebruikt.`,
      volgorde: 3,
    };
  if (d.meer_tijd)
    return {
      label: "Meer tijd gevraagd",
      soort: "warn",
      uitleg: "Verleng via de knop in Telegram.",
      volgorde: 1,
    };
  if (d.gebruikt > 0)
    return {
      label: `In gebruik: ${d.gebruikt}/${d.max}`,
      soort: "ok",
      uitleg: d.verloopt_op
        ? `Werkt tot ${new Date(d.verloopt_op).toLocaleDateString("nl-BE")}.`
        : "",
      volgorde: 2,
    };
  if (d.dm_verstuurd_op)
    return {
      label: "DM verstuurd",
      soort: "accent",
      uitleg: "Nog geen vraag gesteld.",
      volgorde: 3,
    };
  return {
    label: "Link werkt",
    soort: "ok",
    uitleg: "Klaar om op Instagram te sturen.",
    volgorde: 0,
  };
}

function demoLink(d: Demo) {
  return `https://qoreaesthetics.com/demo/${d.token}`;
}

// Claude writes a message per clinic in dm_tekst; without one the dashboard offers a standard text.
function demoBericht(d: Demo) {
  if (d.dm_tekst) return d.dm_tekst;
  const link = demoLink(d);
  if (d.taal === "fr")
    return `Bonjour ! 😊 Voici votre démo : ${link}\n\nTestez-la vous-même, comme une patiente qui pose une question. Elle connaît les soins et les tarifs de votre site. Si une info n'y figure pas, elle le dit honnêtement. La démo fonctionne 7 jours à partir de votre première question, pour 30 messages.\n\nDites-moi ce que vous en pensez !\nLeno`;
  if (d.taal === "en")
    return `Hi! 😊 Here is your demo: ${link}\n\nTest it yourself, like a patient asking a question. It knows the treatments and prices on your website. If something isn't there, it says so honestly. The demo works for 7 days from your first question, for 30 messages.\n\nLet me know what you think!\nLeno`;
  return `Dag! 😊 Hier is jullie demo: ${link}\n\nTest hem gerust zelf, alsof je een patiënt bent die een vraag stuurt. Hij kent de behandelingen en prijzen van jullie website. Staat iets er niet op, dan zegt hij dat eerlijk. De demo werkt 7 dagen vanaf jullie eerste vraag, voor 30 berichten.\n\nLaat me gerust weten wat jullie ervan vinden!\nLeno`;
}

// ig.me opens the chat itself instead of the profile, so Leno only has to paste.
function instagramChat(handle: string) {
  const h = handle
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/\/.*$/, "");
  return h ? `https://ig.me/m/${h}` : "";
}

function Demos() {
  const [sleutel] = useState(leesSleutel);
  const [demos, setDemos] = useState<Demo[] | null>(null);
  const [fout, setFout] = useState("");
  const [laden, setLaden] = useState(false);
  const [gekopieerd, setGekopieerd] = useState("");
  const [bezig, setBezig] = useState("");

  async function ophalen() {
    if (!sleutel) return;
    setLaden(true);
    setFout("");
    try {
      const antwoord = await haalLijst(sleutel);
      if (!antwoord.ok) throw new Error();
      const data = (await antwoord.json()) as { demos?: Demo[] };
      setDemos(data.demos ?? []);
    } catch {
      setFout("De demo's konden niet geladen worden. Probeer het zo opnieuw.");
    } finally {
      setLaden(false);
    }
  }

  useEffect(() => {
    void ophalen();
  }, []);

  async function kopieer(d: Demo) {
    try {
      await navigator.clipboard.writeText(demoBericht(d));
      setGekopieerd(d.code);
      setTimeout(() => setGekopieerd(""), 2500);
    } catch {
      setFout("Kopiëren lukte niet. Selecteer de tekst en kopieer hem zelf.");
    }
  }

  async function dmVerstuurd(d: Demo) {
    setBezig(d.code);
    setFout("");
    try {
      const antwoord = await fetch(DEMO_ACTIE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sleutel,
          code: d.code,
          actie: d.dm_verstuurd_op ? "dm_niet_verstuurd" : "dm_verstuurd",
        }),
      });
      if (!antwoord.ok) throw new Error();
      await ophalen();
    } catch {
      setFout("Bewaren lukte niet. Probeer het opnieuw.");
    } finally {
      setBezig("");
    }
  }

  if (!sleutel) {
    return (
      <section className="dash-section">
        <p className="dash-note">Open eerst Vandaag en vul daar je beheercode in.</p>
      </section>
    );
  }

  if (!demos) {
    return (
      <section className="dash-section">
        <p className="dash-note">{fout || "Demo's laden…"}</p>
      </section>
    );
  }

  const lijst = [...demos].sort((a, b) => demoStaat(a).volgorde - demoStaat(b).volgorde);
  const teSturen = demos.filter((d) => demoStaat(d).volgorde === 0).length;
  const nakijken = demos.filter((d) => demoStaat(d).label === "Nakijken").length;
  const inGebruik = demos.filter((d) => d.gebruikt > 0).length;

  return (
    <section className="dash-section">
      <Cijfers
        items={[
          ["Klaar om te sturen", String(teSturen), "link werkt, DM nog niet verstuurd"],
          ["Nakijken", String(nakijken), "eerst activeren"],
          ["In gebruik", String(inGebruik), "kliniek stelde al vragen"],
        ]}
      />
      {fout && <p className="dash-error">{fout}</p>}
      <div className="dash-card">
        <div className="dash-card-head">
          <h2>Demo's</h2>
          <button
            type="button"
            className="dash-btn"
            onClick={() => void ophalen()}
            disabled={laden}
          >
            {laden ? "Laden…" : "Vernieuwen"}
          </button>
        </div>
        {lijst.length === 0 && <p className="dash-note">Nog geen demo's.</p>}
        <ul className="dash-list">
          {lijst.map((d) => {
            const staat = demoStaat(d);
            const c = d.controle;
            const chat = instagramChat(d.instagram);
            const kanSturen = Boolean(d.verstuurd_op) && d.status !== "mislukt";
            return (
              <li key={d.id} className="dash-task">
                <div className="dash-task-head">
                  <span>
                    <b>{d.kliniek}</b>
                    <small>
                      {d.instagram ? `@${d.instagram.replace(/^@/, "")} · ` : ""}
                      {d.taal.toUpperCase()} · {staat.uitleg}
                    </small>
                  </span>
                  <em className={`dash-pill ${staat.soort}`}>{staat.label}</em>
                </div>
                {c && (
                  <details>
                    <summary className="dash-note">
                      Testvragen {c.ok}/{c.totaal} beantwoord · {c.behandelingen ?? 0}{" "}
                      behandelingen, {c.metPrijs ?? 0} met prijs · {c.vestigingen ?? 0}{" "}
                      vestiging(en)
                      {c.adres === false ? " zonder adres" : ""}
                    </summary>
                    <ul className="dash-list plain">
                      {(c.vragen ?? []).map((v) => (
                        <li key={v.onderwerp}>
                          <span>
                            <b>
                              {v.goed ? "✅" : "⚠️"} {v.onderwerp}
                            </b>
                            <small>{v.antwoord || "geen antwoord"}</small>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {d.status !== "mislukt" && <p className="dash-msg">{demoBericht(d)}</p>}
                <div className="dash-actions">
                  {d.code && d.nakijk && (
                    <a
                      className="dash-btn"
                      href={`https://qoreaesthetics.com/intake/${d.code}?nakijk=${d.nakijk}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Nakijken
                    </a>
                  )}
                  {d.token && d.nakijk && d.status !== "mislukt" && (
                    <a
                      className="dash-btn"
                      href={`${demoLink(d)}?nakijk=${d.nakijk}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Zelf testen
                    </a>
                  )}
                  {/* The clinic's own site, to check what the demo knows against the source. */}
                  {d.website && (
                    <a
                      className="dash-btn"
                      href={/^https?:/i.test(d.website) ? d.website : `https://${d.website}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Website
                    </a>
                  )}
                  {kanSturen && chat && (
                    <a
                      className="dash-btn primary"
                      href={chat}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => void kopieer(d)}
                    >
                      {gekopieerd === d.code
                        ? "Gekopieerd ✓ plak in Instagram"
                        : "Kopieer & open Instagram"}
                    </a>
                  )}
                  {kanSturen && (
                    <KeuzeKnop
                      gekozen={Boolean(d.dm_verstuurd_op)}
                      onClick={() => void dmVerstuurd(d)}
                    >
                      {bezig === d.code ? "Bewaren…" : "DM verstuurd ✓"}
                    </KeuzeKnop>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Klanten() {
  const kanalen: [string, string, string, string][] = [
    ["Instagram", "142", "9", "actief"],
    ["Website", "61", "2", "actief"],
    ["Facebook", "–", "–", "niet gekozen"],
    ["WhatsApp", "–", "–", "niet gekozen"],
  ];
  return (
    <section className="dash-section">
      <div className="dash-card">
        <div className="dash-card-head">
          <h2>Kliniek Aurora</h2>
          <span className="dash-pill ok">Live sinds 2 okt</span>
        </div>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Kanaal</th>
              <th>Gesprekken</th>
              <th>Doorgegeven</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {kanalen.map((r) => (
              <tr key={r[0]}>
                {r.map((c, i) => (
                  <td key={i}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="dash-note">
          Meest gevraagd deze maand: prijs botox, laserontharing, parkeren. Buiten de openingsuren:
          38% van de gesprekken.
        </p>
      </div>
    </section>
  );
}

type VerbruikOverzicht = {
  vanaf: string;
  totaal_usd: number;
  oproepen: number;
  per_onderdeel: { onderdeel: string; oproepen: number; usd: number }[];
  per_kliniek: { kliniek: string; oproepen: number; usd: number; onderdelen: string[] }[];
};

const ONDERDEEL_NAAM: Record<string, string> = {
  chatbot: "Chatbot van klanten",
  demo: "Demo's",
  leads: "Leads zoeken",
  teksten: "Berichten schrijven",
  demo_controle: "Demo-controle",
};

const dollar = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;

// AI cost this month, per part and per clinic, logged by every AI step in n8n (table ai_verbruik).
function Verbruik() {
  const [sleutel] = useState(leesSleutel);
  const [verbruik, setVerbruik] = useState<VerbruikOverzicht | null>(null);
  const [fout, setFout] = useState("");

  useEffect(() => {
    if (!sleutel) return;
    void (async () => {
      try {
        const antwoord = await haalLijst(sleutel);
        if (!antwoord.ok) throw new Error();
        const data = (await antwoord.json()) as { verbruik?: VerbruikOverzicht };
        if (!data.verbruik) throw new Error();
        setVerbruik(data.verbruik);
      } catch {
        setFout("Het verbruik kon niet geladen worden. Probeer het zo opnieuw.");
      }
    })();
  }, [sleutel]);

  if (!sleutel) {
    return (
      <section className="dash-section">
        <p className="dash-note">Open eerst Vandaag en vul daar je beheercode in.</p>
      </section>
    );
  }
  if (!verbruik) {
    return (
      <section className="dash-section">
        <p className="dash-note">{fout || "Verbruik laden…"}</p>
      </section>
    );
  }

  const maand = new Date(verbruik.vanaf).toLocaleDateString("nl-BE", { month: "long", year: "numeric" });
  return (
    <section className="dash-section">
      <Cijfers
        items={[
          [`AI-kost ${maand}`, dollar(verbruik.totaal_usd), "geschat, op basis van de tokens"],
          ["AI-oproepen", String(verbruik.oproepen), "elke vraag aan de AI telt als één"],
          ["Klinieken", String(verbruik.per_kliniek.length), "met eigen verbruik deze maand"],
        ]}
      />
      <div className="dash-card">
        <h2>Per onderdeel</h2>
        {verbruik.per_onderdeel.length === 0 && <p className="dash-note">Nog geen verbruik deze maand.</p>}
        <ul className="dash-list plain">
          {verbruik.per_onderdeel.map((o) => (
            <li key={o.onderdeel}>
              <span>
                <b>{ONDERDEEL_NAAM[o.onderdeel] ?? o.onderdeel}</b>
                <small>{o.oproepen} oproepen</small>
              </span>
              <em className="dash-pill">{dollar(o.usd)}</em>
            </li>
          ))}
        </ul>
      </div>
      <div className="dash-card">
        <h2>Per kliniek</h2>
        <p className="dash-note">Wat elke kliniek je deze maand aan AI kost: haar demo en, als ze klant is, haar chatbot.</p>
        {verbruik.per_kliniek.length === 0 && <p className="dash-note">Nog geen kliniek met verbruik deze maand.</p>}
        <ul className="dash-list plain">
          {verbruik.per_kliniek.map((k) => (
            <li key={k.kliniek}>
              <span>
                <b>{k.kliniek}</b>
                <small>
                  {k.oproepen} oproepen · {k.onderdelen.map((o) => ONDERDEEL_NAAM[o] ?? o).join(", ")}
                </small>
              </span>
              <em className="dash-pill">{dollar(k.usd)}</em>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Betalingen() {
  return (
    <section className="dash-section">
      <div className="dash-card">
        <h2>Betalingen</h2>
        <ul className="dash-list plain">
          <li>
            <span>
              <b>Kliniek Aurora · € 297</b>
              <small>2 oktober · maandabonnement</small>
            </span>
            <em className="dash-pill ok">Ontvangen</em>
          </li>
          <li>
            <span>
              <b>Studio Velvet · € 197</b>
              <small>Stripe probeert opnieuw op 8 oktober</small>
            </span>
            <em className="dash-pill warn">Opnieuw proberen</em>
          </li>
        </ul>
      </div>
    </section>
  );
}

function FicheView({ fiche, terug }: { fiche: Fiche; terug: () => void }) {
  return (
    <section className="dash-section">
      <button type="button" className="dash-back" onClick={terug}>
        ← Terug
      </button>
      <div className="dash-card">
        <div className="dash-card-head">
          <div>
            <h2>{fiche.naam}</h2>
            <p className="dash-sub">
              {fiche.stad} · {fiche.instagram} · {fiche.volgers} volgers · laatste post{" "}
              {fiche.laatstePost}
            </p>
          </div>
          <span className="dash-score big">{fiche.kans}</span>
        </div>
        {fiche.gesprek && <p className="dash-call">Gesprek {fiche.gesprek}</p>}
        <div className="dash-grid">
          <div>
            <h3>Waarom een goede kans</h3>
            <p className="dash-note">{fiche.waarom}</p>
            <h3>Bio</h3>
            <p className="dash-note">{fiche.bio}</p>
          </div>
          <div>
            <h3>Onbeantwoorde vragen op Instagram</h3>
            <ul className="dash-bullets">
              {fiche.vragen.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
            <h3>Gevraagd in de demo</h3>
            {fiche.demoVragen.length ? (
              <ul className="dash-bullets">
                {fiche.demoVragen.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            ) : (
              <p className="dash-note">Nog niets gevraagd.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
