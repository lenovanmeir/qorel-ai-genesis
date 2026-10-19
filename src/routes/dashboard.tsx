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

type Tab = "vandaag" | "morgen" | "week" | "funnel" | "leads" | "demos" | "verbruik" | "klanten" | "betalingen";

const TABS: { id: Tab; label: string }[] = [
  { id: "vandaag", label: "Vandaag" },
  { id: "morgen", label: "Morgen" },
  { id: "week", label: "Deze week" },
  { id: "funnel", label: "Funnel" },
  { id: "leads", label: "Leads" },
  { id: "demos", label: "Demo's" },
  { id: "klanten", label: "Klanten" },
  { id: "verbruik", label: "Verbruik" },
  { id: "betalingen", label: "Betalingen" },
];

// The clinic Leno opens from the Leads tab; its details are fetched only then.
type Fiche = { id: string; kliniek: string };

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
          <span className="dash-badge">Live · Deze week, Klanten en Betalingen: voorbeeld</span>
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
            {tab === "funnel" && <Funnel />}
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

// Since 18/10 the database is the only source of the leads: the Supabase Edge Function "dashboard" serves the
// lists (GET) and saves the buttons (POST). The Google Sheet is only a nightly copy, so there is no n8n fallback.
const LIJST_URL = "https://gqigmmezcmtwusgbdxny.supabase.co/functions/v1/dashboard";

// Every tab needs the same list, so it is fetched once and shared for a minute: switching tabs costs nothing.
// After a button is saved (or "Vernieuwen") the list is fetched fresh.
let lijstCache: { code: string; op: number; antwoord: Promise<Response> } | null = null;

function haalLijst(code: string, vers = false): Promise<Response> {
  if (vers || !lijstCache || lijstCache.code !== code || Date.now() - lijstCache.op > 60_000) {
    const antwoord = fetch(LIJST_URL, { headers: { "x-beheercode": code } });
    antwoord.catch(() => (lijstCache = null));
    lijstCache = { code, op: Date.now(), antwoord };
  }
  return lijstCache.antwoord.then((a) => a.clone());
}

function haalExtra(code: string, vraag: Record<string, string>): Promise<Response> {
  return fetch(`${LIJST_URL}?${new URLSearchParams(vraag).toString()}`, { headers: { "x-beheercode": code } });
}

function bewaar(code: string, body: unknown): Promise<Response> {
  return fetch(LIJST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-beheercode": code },
    body: JSON.stringify(body),
  });
}
const SLEUTEL_OPSLAG = "qore-beheercode";

type Taak = {
  id: string;
  // Row in the old sheet; empty for leads added since 18/10.
  rij: number | null;
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
  // A demo for this clinic (built in advance or on request). Until it is reviewed and active, the card shows
  // "Demo nakijken" instead of the message, so a link that does not work yet can never be sent.
  demo?: { status: string; actief: boolean; nakijk: string } | null;
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
type Keuze = { id: string; actie: Actie; tijd: string };
// Marks are kept per lead id. Marks saved before 18/10 were keyed on the sheet row and are dropped on load.
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
    const bewaard = JSON.parse(localStorage.getItem(KEUZE_OPSLAG) ?? "{}") as Record<
      string,
      Partial<Keuze>
    >;
    return Object.fromEntries(
      Object.entries(bewaard).filter(([, k]) => typeof k?.id === "string" && k.id.length === 36),
    ) as Record<string, Keuze>;
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
  return datumWaarde(a.datum) - datumWaarde(b.datum) || (a.rij ?? 1e9) - (b.rij ?? 1e9);
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
  const [gekopieerd, setGekopieerd] = useState<string | null>(null);

  async function ophalen(code: string, vers = false) {
    setLaden(true);
    setFout("");
    try {
      const antwoord = await haalLijst(code, vers);
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

  function isGekozen(id: string, actie: Actie) {
    return keuzes[`${id}:${groep(actie)}`]?.actie === actie;
  }

  // A first click marks the action, a second click on the same button undoes it.
  function kies(taak: Taak, actie: Actie) {
    const sleutelKeuze = `${taak.id}:${groep(actie)}`;
    const nieuw = { ...keuzes };
    if (nieuw[sleutelKeuze]?.actie === actie) delete nieuw[sleutelKeuze];
    else {
      nieuw[sleutelKeuze] = { id: taak.id, actie, tijd: new Date().toISOString() };
      // "Geen keuzeknop" and "Getikt" contradict each other: the last tap wins.
      if (actie === "vraagknop_geenknop" && nieuw[`${taak.id}:knop`]?.actie === "vraagknop_getikt")
        delete nieuw[`${taak.id}:knop`];
      if (actie === "vraagknop_getikt" && nieuw[`${taak.id}:zien`]?.actie === "vraagknop_geenknop")
        delete nieuw[`${taak.id}:zien`];
    }
    zetKeuzes(nieuw);
  }

  function keuzesVoor(ids: string[]) {
    return Object.entries(keuzes).filter(([, k]) => ids.includes(k.id));
  }

  // Sends all marks of one block in a single request.
  async function verstuur(ids: string[]) {
    const lijstKeuzes = keuzesVoor(ids);
    if (lijstKeuzes.length === 0) return;
    // A tap already proves the clinic has buttons, so "Keuzeknop" is not sent next to "Getikt"
    // (both write column AA and the tap time must stay).
    const getikt = new Set(
      lijstKeuzes.filter(([, k]) => k.actie === "vraagknop_getikt").map(([, k]) => k.id),
    );
    const acties = lijstKeuzes
      .map(([, k]) => k)
      .filter((k) => !(k.actie === "vraagknop_heeft" && getikt.has(k.id)));
    setBezig(true);
    setFout("");
    try {
      const antwoord = await bewaar(sleutel, { acties });
      if (!antwoord.ok) throw new Error();
      const nieuw = { ...keuzes };
      lijstKeuzes.forEach(([k]) => delete nieuw[k]);
      zetKeuzes(nieuw);
      await ophalen(sleutel, true);
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
        nieuw[`${t.id}:knop`] = {
          id: t.id,
          actie: "vraagknop_geen",
          tijd: new Date().toISOString(),
        };
      });
    zetKeuzes(nieuw);
  }

  async function kopieer(taak: Taak) {
    try {
      await navigator.clipboard.writeText(taak.bericht ?? "");
      setGekopieerd(taak.id);
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
    <li key={`tik-${t.id}`}>
      <span>
        <b>
          {t.naam} {t.rij ? <small className="dash-rij">rij {t.rij}</small> : null}
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
          gekozen={isGekozen(t.id, "vraagknop_heeft") || Boolean(t.vraagknop?.startsWith("Heeft"))}
          onClick={() => kies(t, "vraagknop_heeft")}
        >
          Keuzeknop
        </KeuzeKnop>
        <KeuzeKnop
          gekozen={isGekozen(t.id, "vraagknop_geenknop")}
          onClick={() => kies(t, "vraagknop_geenknop")}
        >
          Geen keuzeknop
        </KeuzeKnop>
        <KeuzeKnop
          gekozen={isGekozen(t.id, "vraagknop_getikt")}
          onClick={() => kies(t, "vraagknop_getikt")}
        >
          Getikt ✓
        </KeuzeKnop>
        {metNaarMorgen && (
          <KeuzeKnop
            gekozen={isGekozen(t.id, "naar_morgen")}
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
                <li key={`wacht-${t.id}`}>
                  <span>
                    <b>
                      {t.naam} {t.rij ? <small className="dash-rij">rij {t.rij}</small> : null}
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
                        gekozen={isGekozen(t.id, "vraagknop_geen")}
                        onClick={() => kies(t, "vraagknop_geen")}
                      >
                        Geen antwoord
                      </KeuzeKnop>
                    )}
                    <KeuzeKnop
                      gekozen={isGekozen(t.id, "vraagknop_wel")}
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
              keuzesVoor([...tikNu, ...(lijst.vraagknopWachten ?? [])].map((t) => t.id)).length
            }
            bezig={bezig}
            onClick={() =>
              void verstuur([...tikNu, ...(lijst.vraagknopWachten ?? [])].map((t) => t.id))
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
            onClick={() => void ophalen(sleutel, true)}
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
              key={t.id}
              taak={t}
              gekozen={(a) => isGekozen(t.id, a)}
              gekopieerd={gekopieerd === t.id}
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
            aantal={keuzesVoor(deel.sturen.map((t) => t.id)).length}
            bezig={bezig}
            onClick={() => void verstuur(deel.sturen.map((t) => t.id))}
          />
        )}
      </div>

      {deel.opvolgen.length > 0 && (
        <div className="dash-card" id="dash-blok-opvolgen">
          <h2>Opvolgen</h2>
          <ul className="dash-list">
            {deel.opvolgen.map((t) => (
              <TaakKaart
                key={t.id}
                taak={t}
                gekozen={(a) => isGekozen(t.id, a)}
                gekopieerd={gekopieerd === t.id}
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
              aantal={keuzesVoor(deel.opvolgen.map((t) => t.id)).length}
              bezig={bezig}
              onClick={() => void verstuur(deel.opvolgen.map((t) => t.id))}
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
            aantal={keuzesVoor(opgewarmd.map((t) => t.id)).length}
            bezig={bezig}
            onClick={() => void verstuur(opgewarmd.map((t) => t.id))}
          />
        </div>
      )}

      <div className="dash-grid">
        <div className="dash-card">
          <h2>Opwarmen (doet Claude)</h2>
          {deel.opwarmen.length === 0 && <p className="dash-note">Niets op te warmen.</p>}
          <ul className="dash-list plain">
            {deel.opwarmen.map((t) => (
              <li key={t.id}>
                <span>
                  <b>
                    {t.naam} {t.rij ? <small className="dash-rij">rij {t.rij}</small> : null}
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
                <li key={t.id}>
                  <span>
                    <b>
                      {t.naam} {t.rij ? <small className="dash-rij">rij {t.rij}</small> : null}
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
  if (taak.demo && !taak.demo.actief)
    return <DemoNakijkenKaart taak={taak} acties={acties} gekozen={gekozen} kies={kies} />;
  return (
    <li className="dash-task">
      <div className="dash-task-head">
        <span>
          <b>
            {taak.naam} {taak.rij ? <small className="dash-rij">rij {taak.rij}</small> : null}
          </b>
          <small>{taak.volgendeStap}</small>
        </span>
        <em className={`dash-pill ${isMail ? "warn" : "accent"}`}>
          {isMail ? "Mail" : "Instagram"}
        </em>
      </div>
      {taak.vraagknop && <p className="dash-note">Vraagknop: {taak.vraagknop}</p>}
      {taak.demo?.actief && <p className="dash-note">Met demo: de link in dit bericht werkt.</p>}
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

// A clinic whose demo is not reviewed yet: no message to copy and no "Verstuurd", only the way to the review page.
// Moving it to tomorrow stays possible.
function DemoNakijkenKaart({
  taak,
  acties,
  gekozen,
  kies,
}: {
  taak: Taak;
  acties: [Actie, string][];
  gekozen: (a: Actie) => boolean;
  kies: (a: Actie) => void;
}) {
  const bouwen = taak.demo?.status === "nieuw" || taak.demo?.status === "bouwen";
  return (
    <li className="dash-task">
      <div className="dash-task-head">
        <span>
          <b>
            {taak.naam} {taak.rij ? <small className="dash-rij">rij {taak.rij}</small> : null}
          </b>
          <small>{taak.volgendeStap}</small>
        </span>
        <em className="dash-pill warn">{bouwen ? "Demo wordt gebouwd" : "Demo nakijken"}</em>
      </div>
      <p className="dash-note">
        {bouwen
          ? "De demo voor deze kliniek wordt nog gebouwd."
          : "Er staat een demo klaar voor deze kliniek. Kijk hem na en klik op « Klaar – verstuur demo ». Daarna verschijnt hier het bericht met de werkende link."}
      </p>
      <div className="dash-actions">
        {!bouwen && taak.demo?.nakijk && (
          <a className="dash-btn primary" href={taak.demo.nakijk} target="_blank" rel="noreferrer">
            Demo nakijken
          </a>
        )}
        {acties
          .filter(([actie]) => actie === "naar_morgen")
          .map(([actie, label]) => (
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

type ZoekLead = {
  id: string;
  kliniek: string;
  stad: string | null;
  instagram: string | null;
  kans: number | null;
  status: string;
  fase: string;
};

// Never every clinic at once: the clinics that need Leno now, the counts per stage, and a search that runs in
// the database itself (at most 20 results), so the page stays light however many leads there are.
function Leads({ open }: { open: (f: Fiche) => void }) {
  const [sleutel] = useState(leesSleutel);
  const [heet, setHeet] = useState<HeteLead[] | null>(null);
  const [funnel, setFunnel] = useState<FunnelRij[]>([]);
  const [zoek, setZoek] = useState("");
  const [gevonden, setGevonden] = useState<ZoekLead[] | null>(null);
  const [fout, setFout] = useState("");

  useEffect(() => {
    if (!sleutel) return;
    haalLijst(sleutel)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { heet?: HeteLead[]; funnel?: FunnelRij[] }) => {
        setHeet(d.heet ?? []);
        setFunnel(d.funnel ?? []);
      })
      .catch(() => setFout("De leads konden niet geladen worden. Probeer het zo opnieuw."));
  }, []);

  // Searches 300 ms after the last key, so typing a name costs one request, not one per letter.
  useEffect(() => {
    const term = zoek.trim();
    if (term.length < 2) {
      setGevonden(null);
      return;
    }
    let actueel = true;
    const timer = setTimeout(() => {
      haalExtra(sleutel, { zoek: term })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: { leads?: ZoekLead[] }) => actueel && setGevonden(d.leads ?? []))
        .catch(() => actueel && setFout("Zoeken lukte niet. Probeer het zo opnieuw."));
    }, 300);
    return () => {
      actueel = false;
      clearTimeout(timer);
    };
  }, [zoek]);

  if (!sleutel)
    return <p className="dash-note">Open eerst de tab Vandaag en vul je beheercode in.</p>;

  return (
    <section className="dash-section">
      <div className="dash-card">
        <div className="dash-card-head">
          <h2>Leads</h2>
          <input
            className="dash-zoek"
            type="search"
            placeholder="Zoek op naam, Instagram of stad…"
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
          />
        </div>
        {fout && <p className="dash-note">{fout}</p>}
        {gevonden ? (
          gevonden.length === 0 ? (
            <p className="dash-note">Geen kliniek gevonden voor « {zoek.trim()} ».</p>
          ) : (
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
                {gevonden.map((l) => (
                  <tr key={l.id} onClick={() => open({ id: l.id, kliniek: l.kliniek })}>
                    <td>{l.kliniek}</td>
                    <td>{l.stad}</td>
                    <td>{l.kans === null ? "–" : <span className="dash-score">{l.kans}</span>}</td>
                    <td>{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <>
            <h3>Nu persoonlijk opvolgen</h3>
            {!heet && !fout && <p className="dash-note">Laden…</p>}
            {heet && heet.length === 0 && (
              <p className="dash-note">Niemand wacht op jou. Zoek hierboven een kliniek op naam.</p>
            )}
            <ul className="dash-list">
              {(heet ?? []).map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => open({ id: l.id, kliniek: l.kliniek })}>
                    <span>
                      <b>{l.kliniek}</b>
                      <small>
                        {[l.stad, l.instagram || l.email, `${FASE_NAAM[l.fase] ?? l.fase} ${sinds(l.fase_sinds)}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </span>
                    <em className="dash-pill accent">{FASE_ACTIE[l.fase] ?? ""}</em>
                  </button>
                </li>
              ))}
            </ul>
            {funnel.length > 0 && (
              <p className="dash-note">
                Nu:{" "}
                {funnel
                  .filter((f) => f.nu > 0)
                  .map((f) => `${FASE_NAAM[f.fase] ?? f.fase} ${f.nu}`)
                  .join(" · ")}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// Live demos from Supabase demo_aanvragen, delivered in the same n8n answer as the list of today.

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
  const link = demoLink(d);
  // Demos built in advance carry their DM with [DEMO-LINK]; the real link is filled in here.
  if (d.dm_tekst) return d.dm_tekst.split("[DEMO-LINK]").join(link);
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

  async function ophalen(vers = false) {
    if (!sleutel) return;
    setLaden(true);
    setFout("");
    try {
      const antwoord = await haalLijst(sleutel, vers);
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
      const antwoord = await bewaar(sleutel, {
        demo: { code: d.code, actie: d.dm_verstuurd_op ? "dm_niet_verstuurd" : "dm_verstuurd" },
      });
      if (!antwoord.ok) throw new Error();
      await ophalen(true);
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
            onClick={() => void ophalen(true)}
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

type VerbruikPost = { onderdeel: string; oproepen: number; usd: number };

type VerbruikOverzicht = {
  vanaf: string;
  totaal_usd: number;
  eigen_usd: number;
  klanten_usd: number;
  oproepen: number;
  eigen: VerbruikPost[];
  per_klant: { kliniek: string; usd: number; oproepen: number; onderdelen: VerbruikPost[] }[];
  vaste_kosten?: VasteKost[];
};

type VasteKost = {
  id?: number;
  naam: string;
  categorie: string | null;
  bedrag: number | string;
  valuta: "EUR" | "USD";
  per: "maand" | "jaar";
  actief: boolean;
  notitie?: string | null;
};

// What a fixed cost weighs on one month: yearly costs count for a twelfth.
const perMaand = (k: VasteKost) => (k.actief ? Number(k.bedrag) / (k.per === "jaar" ? 12 : 1) : 0);
const geld = (n: number, valuta: string) => `${valuta === "EUR" ? "€" : "$"}${n.toFixed(2)}`;

// Leno's subscriptions, domains and mail: edited here, saved per row through the Edge Function.
function VasteKosten({
  lijst,
  sleutel,
  opnieuw,
}: {
  lijst: VasteKost[];
  sleutel: string;
  opnieuw: () => void;
}) {
  const [rijen, setRijen] = useState<VasteKost[]>(lijst);
  const [bezig, setBezig] = useState<number | null>(null);
  const [fout, setFout] = useState("");
  const leeg = (): VasteKost => ({
    naam: "",
    categorie: "",
    bedrag: 0,
    valuta: "EUR",
    per: "maand",
    actief: true,
  });
  const [nieuw, setNieuw] = useState<VasteKost>(leeg);

  const zet = (i: number, veld: Partial<VasteKost>) =>
    setRijen((r) => r.map((x, j) => (j === i ? { ...x, ...veld } : x)));

  async function bewaarRij(k: VasteKost, i: number) {
    setBezig(i);
    setFout("");
    try {
      const antwoord = await bewaar(sleutel, { vasteKost: k });
      if (!antwoord.ok) throw new Error();
      if (i === -1) setNieuw(leeg());
      opnieuw();
    } catch {
      setFout("Bewaren lukte niet. Controleer naam en bedrag.");
    } finally {
      setBezig(null);
    }
  }

  const totaal = (valuta: string) =>
    rijen.filter((k) => k.valuta === valuta).reduce((som, k) => som + perMaand(k), 0);
  const regel = (k: VasteKost, i: number, op: (v: Partial<VasteKost>) => void) => (
    <li key={k.id ?? "nieuw"} className="dash-vast">
      <input
        value={k.naam}
        placeholder="Naam (bv. Firecrawl)"
        onChange={(e) => op({ naam: e.target.value })}
      />
      <input
        type="number"
        min="0"
        step="0.01"
        value={k.bedrag}
        onChange={(e) => op({ bedrag: e.target.value })}
      />
      <select
        value={k.valuta}
        onChange={(e) => op({ valuta: e.target.value as VasteKost["valuta"] })}
      >
        <option value="EUR">€</option>
        <option value="USD">$</option>
      </select>
      <select value={k.per} onChange={(e) => op({ per: e.target.value as VasteKost["per"] })}>
        <option value="maand">per maand</option>
        <option value="jaar">per jaar</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={k.actief}
          onChange={(e) => op({ actief: e.target.checked })}
        />{" "}
        actief
      </label>
      <button
        type="button"
        disabled={bezig === i || !k.naam.trim()}
        onClick={() => void bewaarRij(k, i)}
      >
        {bezig === i ? "…" : i === -1 ? "Toevoegen" : "Bewaren"}
      </button>
      {k.notitie && <small>{k.notitie}</small>}
    </li>
  );

  return (
    <div className="dash-card">
      <h2>Vaste kosten</h2>
      <p className="dash-note">
        Per maand: {geld(totaal("EUR"), "EUR")} + {geld(totaal("USD"), "USD")}. Jaarbedragen tellen
        voor een twaalfde mee.
      </p>
      {fout && <p className="dash-note">{fout}</p>}
      <ul className="dash-list plain">
        {rijen.map((k, i) => regel(k, i, (v) => zet(i, v)))}
        {regel(nieuw, -1, (v) => setNieuw((n) => ({ ...n, ...v })))}
      </ul>
    </div>
  );
}

const ONDERDEEL_NAAM: Record<string, string> = {
  leads: "Leads zoeken",
  teksten: "Berichten schrijven",
  website_inlezen: "Website inlezen (demo's bouwen)",
  demo_test: "Demo's testen (jij en de controle)",
  demo: "Demo-gesprekken van prospects",
  chatbot: "Chatbot (gesprekken)",
  vertalen: "Vertalen",
  demo_controle: "Demo-controle",
  ab_test: "Modellen vergelijken (A/B-test)",
};

const dollar = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;

function Posten({ posten }: { posten: VerbruikPost[] }) {
  return (
    <ul className="dash-list plain">
      {posten.map((o) => (
        <li key={o.onderdeel}>
          <span>
            <b>{ONDERDEEL_NAAM[o.onderdeel] ?? o.onderdeel}</b>
            <small>{o.oproepen} oproepen</small>
          </span>
          <em className="dash-pill">{dollar(o.usd)}</em>
        </li>
      ))}
    </ul>
  );
}

// AI cost this month, logged by every AI step (table ai_verbruik): Leno's own costs per part, and per paying
// client. A clinic counts as a client once clinics.is_klant is on; until then its costs (demo) are Leno's own.
function Verbruik() {
  const [sleutel] = useState(leesSleutel);
  const [verbruik, setVerbruik] = useState<VerbruikOverzicht | null>(null);
  const [fout, setFout] = useState("");
  const [versie, setVersie] = useState(0);

  useEffect(() => {
    if (!sleutel) return;
    void (async () => {
      try {
        const antwoord = await haalLijst(sleutel, versie > 0);
        if (!antwoord.ok) throw new Error();
        const data = (await antwoord.json()) as { verbruik?: VerbruikOverzicht };
        if (!data.verbruik) throw new Error();
        setVerbruik(data.verbruik);
      } catch {
        setFout("Het verbruik kon niet geladen worden. Probeer het zo opnieuw.");
      }
    })();
  }, [sleutel, versie]);

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

  const maand = new Date(verbruik.vanaf).toLocaleDateString("nl-BE", {
    month: "long",
    year: "numeric",
  });
  return (
    <section className="dash-section">
      <Cijfers
        items={[
          [`AI-kost ${maand}`, dollar(verbruik.totaal_usd), `${verbruik.oproepen} oproepen`],
          ["Jouw eigen AI-kosten", dollar(verbruik.eigen_usd), "leads, teksten, demo's"],
          [
            "Kosten van klanten",
            dollar(verbruik.klanten_usd),
            `${verbruik.per_klant.length} klanten`,
          ],
        ]}
      />
      <VasteKosten
        key={versie}
        lijst={verbruik.vaste_kosten ?? []}
        sleutel={sleutel}
        opnieuw={() => setVersie((v) => v + 1)}
      />
      <div className="dash-card">
        <h2>Jouw eigen AI-kosten</h2>
        <p className="dash-note">
          OpenAI rekent in dollar. Bedragen zijn berekend uit de tokens van elke oproep.
        </p>
        {verbruik.eigen.length === 0 ? (
          <p className="dash-note">Nog geen eigen kosten deze maand.</p>
        ) : (
          <Posten posten={verbruik.eigen} />
        )}
      </div>
      <div className="dash-card">
        <h2>Per klant</h2>
        {verbruik.per_klant.length === 0 && (
          <p className="dash-note">
            Nog geen betalende klant. Zodra een kliniek klant is, verschijnt hier wat haar chatbot per
            kanaal kost.
          </p>
        )}
        {verbruik.per_klant.map((k) => (
          <div key={k.kliniek}>
            <h3>
              {k.kliniek} · {dollar(k.usd)}
            </h3>
            <Posten posten={k.onderdelen} />
          </div>
        ))}
      </div>
    </section>
  );
}

type FunnelRij = { fase: string; rang: number | null; bereikt: number; nu: number };
type HeteLead = { id: string; sheet_rij: number | null; kliniek: string; stad: string | null; instagram: string | null; email: string | null; status: string; fase: string; fase_sinds: string };

const FASE_NAAM: Record<string, string> = {
  NEW: "Nieuw",
  QUALIFIED: "Klaar om te sturen",
  WARMING: "Opwarmen",
  CONTACTED: "Gecontacteerd",
  FOLLOW_UP: "Opgevolgd",
  REPLIED: "Geantwoord",
  DEMO_READY: "Demo klaar",
  DEMO_SENT: "Demo verstuurd",
  DEMO_USED: "Demo gebruikt",
  MEETING_BOOKED: "Gesprek geboekt",
  MEETING_HELD: "Gesprek gehad",
  WON: "Klant",
  LOST: "Verloren",
  NURTURE: "Later opnieuw",
  DISQUALIFIED: "Niet geschikt",
};

// What Leno does next with a clinic in this stage.
const FASE_ACTIE: Record<string, string> = {
  REPLIED: "Antwoord geven",
  DEMO_USED: "Nu persoonlijk opvolgen",
  MEETING_BOOKED: "Gesprek voorbereiden",
  MEETING_HELD: "Voorstel of factuur sturen",
};

const procent = (deel: number, geheel: number) => (geheel ? `${Math.round((deel / geheel) * 100)}%` : "–");
const sinds = (iso: string) => {
  const dagen = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
  return dagen <= 0 ? "vandaag" : dagen === 1 ? "gisteren" : `${dagen} dagen geleden`;
};

// Where clinics drop off, from first contact to client. Read from the database view lead_funnel:
// "bereikt" counts every clinic that ever got this far, so a lost clinic still counts for how far it came.
function Funnel() {
  const [sleutel] = useState(leesSleutel);
  const [data, setData] = useState<{ funnel: FunnelRij[]; heet: HeteLead[] } | null>(null);
  const [fout, setFout] = useState("");

  useEffect(() => {
    if (!sleutel) return;
    void (async () => {
      try {
        const antwoord = await haalLijst(sleutel);
        if (!antwoord.ok) throw new Error();
        const d = (await antwoord.json()) as { funnel?: FunnelRij[]; heet?: HeteLead[] };
        if (!d.funnel?.length) throw new Error();
        setData({ funnel: d.funnel, heet: d.heet ?? [] });
      } catch {
        setFout("De funnel kon niet geladen worden. Probeer het zo opnieuw.");
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
  if (!data) {
    return (
      <section className="dash-section">
        <p className="dash-note">{fout || "Funnel laden…"}</p>
      </section>
    );
  }

  const n = (fase: string) => data.funnel.find((f) => f.fase === fase)?.bereikt ?? 0;
  // The steps that matter for sales; warm-up and qualification stay out of the conversion figures.
  const stappen = ["CONTACTED", "REPLIED", "DEMO_SENT", "DEMO_USED", "MEETING_BOOKED", "MEETING_HELD", "WON"];
  const hoogste = Math.max(1, n("CONTACTED"));
  const uitgang = data.funnel.filter((f) => f.rang === null);

  return (
    <section className="dash-section">
      <Cijfers
        items={[
          ["Antwoordratio", procent(n("REPLIED"), n("CONTACTED")), `${n("REPLIED")} van ${n("CONTACTED")} gecontacteerd`],
          ["Demo → gesprek", procent(n("MEETING_BOOKED"), n("DEMO_SENT")), `${n("MEETING_BOOKED")} van ${n("DEMO_SENT")} demo's`],
          ["Gesprek → klant", procent(n("WON"), n("MEETING_HELD")), `${n("WON")} van ${n("MEETING_HELD")} gesprekken`],
        ]}
      />
      <div className="dash-card">
        <h2>Nu persoonlijk opvolgen</h2>
        {data.heet.length === 0 && <p className="dash-note">Niemand wacht op jou. Klinieken die antwoorden, hun demo gebruiken of een gesprek boeken, verschijnen hier.</p>}
        <ul className="dash-list plain">
          {data.heet.map((l) => (
            <li key={`${l.kliniek}-${l.fase_sinds}`}>
              <span>
                <b>{l.kliniek}</b>
                <small>
                  {[l.stad, l.instagram || l.email, `${FASE_NAAM[l.fase] ?? l.fase} ${sinds(l.fase_sinds)}`].filter(Boolean).join(" · ")}
                </small>
              </span>
              <em className={`dash-pill ${l.fase === "DEMO_USED" || l.fase === "MEETING_BOOKED" ? "accent" : "warn"}`}>{FASE_ACTIE[l.fase] ?? ""}</em>
            </li>
          ))}
        </ul>
      </div>
      <div className="dash-card">
        <h2>Van contact tot klant</h2>
        <p className="dash-note">Hoeveel klinieken elke stap echt hebben gehad, en welk deel van alle gecontacteerde klinieken dat is.</p>
        <ul className="dash-list plain">
          {stappen.map((fase, i) => {
            const aantal = n(fase);
            return (
              <li key={fase} style={{ backgroundImage: `linear-gradient(90deg, rgba(99, 102, 255, 0.18) ${(aantal / hoogste) * 100}%, transparent 0)` }}>
                <span>
                  <b>{FASE_NAAM[fase]}</b>
                  <small>{data.funnel.find((f) => f.fase === fase)?.nu ?? 0} staan hier nu</small>
                </span>
                <em className="dash-pill">
                  {aantal}
                  {i > 0 && ` · ${procent(aantal, n("CONTACTED"))}`}
                </em>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="dash-card">
        <h2>Uit de funnel</h2>
        <ul className="dash-list plain">
          {uitgang.map((f) => (
            <li key={f.fase}>
              <span>
                <b>{FASE_NAAM[f.fase] ?? f.fase}</b>
              </span>
              <em className="dash-pill">{f.nu}</em>
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

type LeadDetail = {
  lead: Record<string, string | number | null>;
  gebeurtenissen: {
    soort: string;
    kanaal: string | null;
    inhoud: string | null;
    bron: string;
    op: string;
  }[];
  demo: {
    status: string;
    token: string;
    verstuurd_op: string | null;
    berichten_gebruikt: number;
    max_berichten: number;
    verloopt_op: string | null;
  } | null;
};

function FicheView({ fiche, terug }: { fiche: Fiche; terug: () => void }) {
  const [sleutel] = useState(leesSleutel);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [fout, setFout] = useState("");

  useEffect(() => {
    haalExtra(sleutel, { id: fiche.id })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: LeadDetail) => setDetail(d))
      .catch(() => setFout("Deze kliniek kon niet geladen worden."));
  }, [fiche.id]);

  const l = detail?.lead ?? {};
  const veld = (k: string) => (l[k] === null || l[k] === undefined ? "" : String(l[k]));
  // Belgian dates, also when Leno opens the dashboard abroad.
  const datum = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("nl-BE", { timeZone: "Europe/Brussels" }) : "";
  return (
    <section className="dash-section">
      <button type="button" className="dash-back" onClick={terug}>
        ← Terug
      </button>
      <div className="dash-card">
        <div className="dash-card-head">
          <div>
            <h2>{fiche.kliniek}</h2>
            <p className="dash-sub">
              {[veld("stad"), veld("instagram"), veld("website"), veld("email"), veld("telefoon")]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {veld("kans") && <span className="dash-score big">{veld("kans")}</span>}
        </div>
        {fout && <p className="dash-note">{fout}</p>}
        {!detail && !fout && <p className="dash-note">Laden…</p>}
        {detail && (
          <>
            <p className="dash-call">
              {veld("status")} · {FASE_NAAM[veld("fase")] ?? veld("fase")}
              {veld("opvolgen_op") ? ` · opvolgen op ${datum(veld("opvolgen_op"))}` : ""}
            </p>
            <div className="dash-grid">
              <div>
                <h3>Waarom een goede kans</h3>
                <p className="dash-note">{veld("waarom") || "–"}</p>
                <h3>Notities</h3>
                <p className="dash-note">{veld("notities") || "–"}</p>
                {detail.demo && (
                  <>
                    <h3>Demo</h3>
                    <p className="dash-note">
                      {detail.demo.verstuurd_op ? "Link werkt" : "Nog niet verstuurd"} ·{" "}
                      {detail.demo.berichten_gebruikt}/{detail.demo.max_berichten} berichten
                      {detail.demo.verloopt_op ? ` · tot ${datum(detail.demo.verloopt_op)}` : ""}
                    </p>
                  </>
                )}
                <h3>Tijdlijn</h3>
                {detail.gebeurtenissen.length === 0 ? (
                  <p className="dash-note">Nog niets gebeurd.</p>
                ) : (
                  <ul className="dash-bullets">
                    {detail.gebeurtenissen.map((g) => (
                      <li key={`${g.op}-${g.soort}`}>
                        {datum(g.op)} · {g.soort}
                        {g.inhoud ? `: ${g.inhoud}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3>Eerste bericht</h3>
                <p className="dash-note" style={{ whiteSpace: "pre-wrap" }}>
                  {veld("bericht") || "Nog geen bericht."}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
