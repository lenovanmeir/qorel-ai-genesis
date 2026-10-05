import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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
    demoVragen: ["Wat kost laserontharing?", "Zijn jullie open op zaterdag?", "Hoeveel sessies heb ik nodig?"],
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
            <span className="q" aria-hidden="true">Q</span>
            <span className="wm">
              QORE<small>DASHBOARD</small>
            </span>
          </span>
          <span className="dash-badge">Voorbeeld met testcijfers</span>
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
            {tab === "vandaag" && <Vandaag open={setFiche} />}
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

function Vandaag({ open }: { open: (f: Fiche) => void }) {
  return (
    <section className="dash-section">
      <Cijfers
        items={[
          ["Nieuwe leads vannacht", "28", "Antwerpen"],
          ["DM's klaar om te sturen", "20", "bericht staat in je sheet"],
          ["Antwoorden", "3", "sinds gisteren"],
          ["Demo's actief", "5", "2 bijna op"],
          ["n8n-verbruik", "38%", "van 2.500 deze maand"],
        ]}
      />
      <div className="dash-grid">
        <div className="dash-card">
          <h2>Vandaag opvolgen</h2>
          <ul className="dash-list">
            {FICHES.map((f) => (
              <li key={f.naam}>
                <button type="button" onClick={() => open(f)}>
                  <span>
                    <b>{f.naam}</b>
                    <small>{f.waarom}</small>
                  </span>
                  <em className="dash-pill">{f.status}</em>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="dash-card">
          <h2>Gesprekken</h2>
          <ul className="dash-list">
            <li>
              <button type="button" onClick={() => open(FICHES[0])}>
                <span>
                  <b>Kliniek Aurora</b>
                  <small>{FICHES[0].gesprek}</small>
                </span>
                <em className="dash-pill accent">Fiche →</em>
              </button>
            </li>
          </ul>
          <h2 className="dash-h2-spaced">Opgelost of te bekijken</h2>
          <ul className="dash-list plain">
            <li>
              <span>
                <b>Database even traag om 03:12</b>
                <small>Automatisch opnieuw geprobeerd, alles werkt</small>
              </span>
              <em className="dash-pill ok">Opgelost</em>
            </li>
          </ul>
        </div>
      </div>
    </section>
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
        <p className="dash-note">Meest gevraagd deze maand: prijs botox, laserontharing, parkeren. Buiten de openingsuren: 38% van de gesprekken.</p>
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
              {fiche.stad} · {fiche.instagram} · {fiche.volgers} volgers · laatste post {fiche.laatstePost}
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
