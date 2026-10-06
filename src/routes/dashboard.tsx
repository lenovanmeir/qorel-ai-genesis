import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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

type Tab = "vandaag" | "week" | "leads" | "demos" | "klanten" | "betalingen";

const TABS: { id: Tab; label: string }[] = [
  { id: "vandaag", label: "Vandaag" },
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
          <span className="dash-badge">Vandaag: live · rest: voorbeeld</span>
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
            {tab === "vandaag" && <LiveVandaag />}
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
};

type Lijst = {
  vandaag: string;
  sturen: Taak[];
  opwarmen: Taak[];
  opvolgen: Taak[];
  nakijken: Taak[];
};

type Actie = "verstuurd" | "opvolging1" | "opvolging2" | "geantwoord";

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

function LiveVandaag() {
  const [sleutel, setSleutel] = useState("");
  const [invoer, setInvoer] = useState("");
  const [lijst, setLijst] = useState<Lijst | null>(null);
  const [fout, setFout] = useState("");
  const [laden, setLaden] = useState(false);
  const [bezig, setBezig] = useState<number | null>(null);
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

  useEffect(() => {
    const code = leesSleutel();
    if (code) void ophalen(code);
  }, []);

  async function markeer(taak: Taak, actie: Actie) {
    setBezig(taak.rij);
    try {
      const antwoord = await fetch(ACTIE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sleutel, rij: taak.rij, actie }),
      });
      if (!antwoord.ok) throw new Error();
      await ophalen(sleutel);
    } catch {
      setFout(`${taak.naam} kon niet bijgewerkt worden. Probeer het opnieuw.`);
    } finally {
      setBezig(null);
    }
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
          <h2>Vandaag</h2>
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

  return (
    <section className="dash-section">
      <Cijfers
        items={[
          ["Vandaag versturen", String(lijst.sturen.length), "van boven naar beneden"],
          ["Opvolgen", String(lijst.opvolgen.length), "geen antwoord gekregen"],
          ["Opwarmen", String(lijst.opwarmen.length), "doet Claude, verspreid over de dag"],
          ["Nakijken", String(lijst.nakijken.length), "eerst iets uitzoeken"],
        ]}
      />
      {fout && <p className="dash-error">{fout}</p>}

      <div className="dash-card">
        <div className="dash-card-head">
          <h2>Vandaag versturen</h2>
          <button
            type="button"
            className="dash-btn"
            onClick={() => void ophalen(sleutel)}
            disabled={laden}
          >
            {laden ? "Laden…" : "Vernieuwen"}
          </button>
        </div>
        {lijst.sturen.length === 0 && <p className="dash-note">Niets meer te versturen vandaag.</p>}
        <ul className="dash-list">
          {lijst.sturen.map((t) => (
            <TaakKaart
              key={t.rij}
              taak={t}
              bezig={bezig === t.rij}
              gekopieerd={gekopieerd === t.rij}
              kopieer={() => void kopieer(t)}
              acties={[["verstuurd", "Verstuurd ✓"]]}
              markeer={(a) => void markeer(t, a)}
            />
          ))}
        </ul>
      </div>

      {lijst.opvolgen.length > 0 && (
        <div className="dash-card">
          <h2>Opvolgen</h2>
          <ul className="dash-list">
            {lijst.opvolgen.map((t) => (
              <TaakKaart
                key={t.rij}
                taak={t}
                bezig={bezig === t.rij}
                gekopieerd={gekopieerd === t.rij}
                kopieer={() => void kopieer(t)}
                acties={[
                  [
                    t.stap === 2 ? "opvolging2" : "opvolging1",
                    `Opvolging ${t.stap ?? 1} verstuurd ✓`,
                  ],
                  ["geantwoord", "Ze hebben geantwoord"],
                ]}
                markeer={(a) => void markeer(t, a)}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="dash-grid">
        <div className="dash-card">
          <h2>Opwarmen (doet Claude)</h2>
          {lijst.opwarmen.length === 0 && <p className="dash-note">Niets op te warmen vandaag.</p>}
          <ul className="dash-list plain">
            {lijst.opwarmen.map((t) => (
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
      </div>
    </section>
  );
}

function TaakKaart({
  taak,
  bezig,
  gekopieerd,
  kopieer,
  acties,
  markeer,
}: {
  taak: Taak;
  bezig: boolean;
  gekopieerd: boolean;
  kopieer: () => void;
  acties: [Actie, string][];
  markeer: (a: Actie) => void;
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
      <p className="dash-msg">{taak.bericht}</p>
      <div className="dash-actions">
        <button type="button" className="dash-btn" onClick={kopieer}>
          {gekopieerd ? "Gekopieerd" : "Kopieer bericht"}
        </button>
        {isMail ? (
          <a className="dash-btn" href={mailLink(taak)}>
            Open in mail
          </a>
        ) : (
          taak.instagram && (
            <a className="dash-btn" href={taak.instagram} target="_blank" rel="noreferrer">
              Open Instagram
            </a>
          )
        )}
        {acties.map(([actie, label]) => (
          <button
            key={actie}
            type="button"
            className="dash-btn primary"
            disabled={bezig}
            onClick={() => markeer(actie)}
          >
            {bezig ? "Bezig…" : label}
          </button>
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
