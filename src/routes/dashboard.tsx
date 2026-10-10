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

type Tab = "vandaag" | "morgen" | "week" | "leads" | "demos" | "klanten" | "betalingen";

const TABS: { id: Tab; label: string }[] = [
  { id: "vandaag", label: "Vandaag" },
  { id: "morgen", label: "Morgen" },
  { id: "week", label: "Deze week" },
  { id: "leads", label: "Leads" },
  { id: "demos", label: "Demo's" },
  { id: "klanten", label: "Klanten" },
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
          <span className="dash-badge">Vandaag &amp; morgen: live · rest: voorbeeld</span>
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
      const antwoord = await fetch(`${VANDAAG_URL}?sleutel=${encodeURIComponent(code)}`);
      if (antwoord.status === 403) {
        setFout("Die beheercode klopt niet.");
        setSleutel("");
        return;
      }
      if (!antwoord.ok) throw new Error();
      setLijst((await antwoord.json()) as Lijst);
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

      {!morgen &&
        ((lijst.vraagknopTikken?.length ?? 0) > 0 || (lijst.vraagknopWachten?.length ?? 0) > 0) && (
          <div className="dash-card">
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
              Open de chat in de Instagram-app. Geen keuzeknoppen? Klik op &quot;Geen
              keuzeknop&quot;. Wel? Tik op één voorgestelde vraag en klik op &quot;Getikt ✓&quot;.
              Krijg je na 2,5 uur geen antwoord, dan komt dat pijnpunt automatisch in hun DM. Wat je
              aanduidt, gaat pas weg als je onderaan op Versturen tikt.
            </p>
            <ul className="dash-list plain">
              {(lijst.vraagknopTikken ?? []).map((t) => (
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
                    {!t.vraagknop?.startsWith("Heeft") && (
                      <KeuzeKnop
                        gekozen={isGekozen(t.rij, "vraagknop_heeft")}
                        onClick={() => kies(t, "vraagknop_heeft")}
                      >
                        Keuzeknop
                      </KeuzeKnop>
                    )}
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
                    <KeuzeKnop
                      gekozen={isGekozen(t.rij, "naar_morgen")}
                      onClick={() => kies(t, "naar_morgen")}
                    >
                      Naar morgen
                    </KeuzeKnop>
                  </span>
                </li>
              ))}
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
                keuzesVoor(
                  [...(lijst.vraagknopTikken ?? []), ...(lijst.vraagknopWachten ?? [])].map(
                    (t) => t.rij,
                  ),
                ).length
              }
              bezig={bezig}
              onClick={() =>
                void verstuur(
                  [...(lijst.vraagknopTikken ?? []), ...(lijst.vraagknopWachten ?? [])].map(
                    (t) => t.rij,
                  ),
                )
              }
            />
          </div>
        )}

      <div className="dash-card">
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
        <div className="dash-card">
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

function Demos() {
  const rijen: [string, string, string, string][] = [
    ["Kliniek Aurora", "In gebruik", "29 van 30 berichten over", "tot zondag 11 okt"],
    ["Atelier Lumi", "Verstuurd", "nog geen vraag", "dag 3: stuur een berichtje"],
    ["Studio Velvet", "Bijna op", "3 berichten over", "meer tijd gevraagd"],
  ];
  return (
    <section className="dash-section">
      <div className="dash-card">
        <h2>Demo's</h2>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Kliniek</th>
              <th>Status</th>
              <th>Berichten</th>
              <th>Let op</th>
            </tr>
          </thead>
          <tbody>
            {rijen.map((r) => (
              <tr key={r[0]}>
                {r.map((c, i) => (
                  <td key={i}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
