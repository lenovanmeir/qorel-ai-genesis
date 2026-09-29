import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import aestheticsCss from "../styles/aesthetics.css?url";

// Served at the root of qoreaesthetics.com through the hostname rewrite in router.tsx.
const SITE_URL = "https://qoreaesthetics.com/";
const DEMO_URL = "https://qorelabs.app.n8n.cloud/webhook/qa-demo-aanvraag";
const SUPPORT_EMAIL = "support@qorelabs.io";
const INSTAGRAM_URL = "https://www.instagram.com/qoreaesthetics/";

const TITLE = "Qore Aesthetics · AI-receptioniste voor esthetische klinieken";
const DESCRIPTION =
  "Je kliniek is gesloten. Je patiënten niet. Een AI-receptioniste die dag en nacht antwoordt op Instagram, WhatsApp, Facebook en je website, in het Nederlands, Frans en Engels.";

export const Route = createFileRoute("/aesthetics")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "author", content: "Qore Aesthetics" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:site_name", content: "Qore Aesthetics" },
      { property: "og:locale", content: "nl_BE" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "theme-color", content: "#07070B" },
    ],
    links: [
      { rel: "canonical", href: SITE_URL },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Cormorant+Garamond:wght@300&display=swap",
      },
      { rel: "stylesheet", href: aestheticsCss },
    ],
  }),
  component: AestheticsHome,
});

type Keuze = "book" | "price" | "loc";

const KEUZES: { id: Keuze; label: string; antwoord: string }[] = [
  {
    id: "book",
    label: "📅 Gratis intake",
    antwoord: "Top! Via deze link kies je zelf een moment voor je gratis intake. Tot snel! ✨",
  },
  {
    id: "price",
    label: "💰 Prijzen",
    antwoord:
      "Botox vanaf €190, lipfiller vanaf €320. Voor een persoonlijk plan kan je een gratis intake plannen.",
  },
  {
    id: "loc",
    label: "📍 Locatie",
    antwoord: "We zitten in het centrum, met parking om de hoek. Zal ik je de route sturen?",
  },
];

const PAKKETTEN = [
  {
    naam: "Start",
    tag: "Om te starten",
    fit: "Voor een praktijk met één behandelaar.",
    maand: "239",
    jaar: "199",
    opstartMaand: "950",
    opstartJaar: "700",
    punten: [
      "1 kanaal naar keuze: Instagram óf website",
      "Nederlands, Frans en Engels",
      "Maandrapport",
      "Zelf je info aanpassen",
    ],
    featured: false,
  },
  {
    naam: "Groei",
    tag: "Meest gekozen",
    fit: "Voor een kliniek met een team.",
    maand: "419",
    jaar: "349",
    opstartMaand: "1.450",
    opstartJaar: "1.200",
    punten: [
      "Instagram, Facebook en website",
      "Nederlands, Frans en Engels",
      "Maandrapport per kanaal",
      "Zelf je info aanpassen",
    ],
    featured: true,
  },
  {
    naam: "Compleet",
    tag: "Alles inbegrepen",
    fit: "Voor meerdere vestigingen of veel vragen.",
    maand: "659",
    jaar: "549",
    opstartMaand: "1.950",
    opstartJaar: "1.700",
    punten: [
      "Alles van Groei + WhatsApp",
      "Voorrang: wijzigingen dezelfde dag",
      "Maandrapport + kwartaalgesprek",
      "Een 4e taal inbegrepen",
    ],
    featured: false,
  },
];

const PIJNPUNTEN = [
  { stamp: "23:14", vraag: "Hoeveel kost Botox bij jullie?", tekst: "Je leest het de volgende ochtend. Zij hebben al elders geboekt." },
  { stamp: "10:30", vraag: "Kan ik deze week nog langskomen?", tekst: "Je telefoon trilt, maar je staat midden in een behandeling." },
  { stamp: "Elke dag", vraag: "Waar zijn jullie? Is er parking?", tekst: "Twintig keer dezelfde vraag, twintig keer typen." },
  { stamp: "Zondag", vraag: "Bonjour, vous parlez français ?", tekst: "Wie geen antwoord krijgt in zijn taal, komt niet terug." },
  { stamp: "19:05", vraag: "Hi! Do you do lip filler? I'm in town for a week.", tekst: "Expats en toeristen boeken waar ze meteen in het Engels geholpen worden." },
  { stamp: "01:20", vraag: "Is deze zwelling normaal na mijn filler?", tekst: "Een medische vraag hoort bij jou. De receptioniste stuurt ze meteen door, in plaats van te gokken." },
];

const RAPPORT = [
  { kanaal: "Instagram", gesprekken: 84, buiten: 47, agenda: 19, doorgestuurd: 3 },
  { kanaal: "WhatsApp", gesprekken: 52, buiten: 21, agenda: 11, doorgestuurd: 2 },
  { kanaal: "Website", gesprekken: 31, buiten: 12, agenda: 6, doorgestuurd: 1 },
];

const VRAGEN = [
  { v: "Wat als de receptioniste het antwoord niet weet?", a: "Dan zegt ze dat eerlijk en stuurt ze de vraag door naar jou. Ze verzint niets." },
  { v: "Geeft ze medisch advies?", a: "Nee. Medische vragen gaan altijd naar jou of je team." },
  { v: "Klinkt het niet als een robot?", a: "Nee. Je receptioniste schrijft in jouw toon, met jouw aanspreekvorm en jouw woorden. Je leest en test alles voor we live gaan." },
  { v: "Hoeveel werk is het voor mij?", a: "Weinig. Wij lezen je website in en zetten alles klaar. Jij vult aan wat ontbreekt en test. Daarna pas je zelf aan wanneer je wil." },
  { v: "Werkt het met mijn agenda?", a: "Ja. Je receptioniste stuurt klanten via een link naar de online agenda die je al gebruikt." },
  { v: "Wat als we meer vragen krijgen dan ons pakket?", a: "Dan verwittigen we je eerst. Je receptioniste blijft gewoon antwoorden, en samen kijken we of een groter pakket beter past." },
  { v: "Hoe betaal ik?", a: "De opstart per factuur, via overschrijving of een betaal-QR. We starten zodra je betaling binnen is. Het maandbedrag loopt daarna automatisch via kaart." },
  { v: "Kan ik opzeggen?", a: "Maand-tot-maand: elke maand. Jaarcontract: het loopt tot het einde van de 12 maanden." },
];

function AestheticsHome() {
  return (
    <div className="qa">
      <div className="wrap">
        <nav className="top" aria-label="Hoofdmenu">
          <a className="logo" href="#top" aria-label="Qore Aesthetics">
            <span className="q" aria-hidden="true">Q</span>
            <span className="wm">
              QORE<small>AESTHETICS</small>
            </span>
          </a>
          <div className="links">
            <a href="#hoe">Hoe het werkt</a>
            <a href="#rapport">Rapport</a>
            <a href="#pakketten">Pakketten</a>
            <a href="#faq">Vragen</a>
          </div>
          <a className="btn primary" href="#aanvraag">
            Gratis demo
          </a>
        </nav>

        <main>
          <header className="hero" id="top">
            <div>
              <span className="stamp">21:47</span>
              <h1>
                Je kliniek is gesloten. <span className="hl">Je patiënten niet.</span>
                <span className="soft">
                  Elke vraag binnen een minuut beantwoord, dag en nacht, en omgezet in een ingepland consult.
                </span>
              </h1>
              <p className="lede">
                Een AI-receptioniste die antwoordt op Instagram, WhatsApp, Facebook en je website, met jouw prijzen, jouw
                behandelingen en in jouw toon. In het Nederlands, Frans en Engels.
              </p>
              <div className="ctas">
                <a className="btn primary" href="#aanvraag">
                  Vraag je gratis demo aan →
                </a>
                <a className="btn" href="#probeer">
                  Probeer de demo
                </a>
              </div>
              <div className="micro">
                <span>Gebouwd met jouw eigen info</span>
                <span>Geen betaalgegevens nodig</span>
                <span>Live binnen 10 werkdagen, of je opstart terug</span>
              </div>
            </div>
            <DemoGesprek />
          </header>

          <div className="facts" aria-label="Kerngegevens">
            <div><b>&lt; 1 min</b><span>antwoord, ook om 21:47</span></div>
            <div><b>4 kanalen</b><span>Instagram, WhatsApp, Facebook, website</span></div>
            <div><b>NL · FR · EN</b><span>standaard inbegrepen</span></div>
            <div><b>Zelf aanpassen</b><span>nieuwe prijs? Opslaan en klaar</span></div>
          </div>

          <section aria-labelledby="h-pain">
            <p className="eyebrow">Herken je dit?</p>
            <h2 id="h-pain">
              Je beste klanten stellen hun vraag <span className="hl">als jij niet kan antwoorden.</span>
            </h2>
            <div className="pains">
              {PIJNPUNTEN.map((p) => (
                <div className="pain" key={p.stamp}>
                  <span className="stamp">{p.stamp}</span>
                  <q>{p.vraag}</q>
                  <p>{p.tekst}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="hoe" aria-labelledby="h-hoe">
            <p className="eyebrow">Hoe het werkt</p>
            <h2 id="h-hoe">
              Eerst zien. <span className="hl">Dan pas beslissen.</span>
            </h2>
            <ol className="steps">
              <li>
                <h3>Gratis demo</h3>
                <p>Wij lezen je website in en bouwen een demo met jóuw behandelingen en prijzen. Jij krijgt een link en test zelf.</p>
              </li>
              <li>
                <h3>Jij keurt goed</h3>
                <p>Je vult je intake aan, test met je team en we passen aan tot alles klopt. Pas na jouw goedkeuring gaan we live.</p>
              </li>
              <li>
                <h3>Live</h3>
                <p>Op je Instagram, WhatsApp, Facebook en website. Vanaf dan antwoordt je receptioniste dag en nacht.</p>
              </li>
            </ol>
            <div className="guarantee">
              <strong>Binnen 10 werkdagen live, of je opstart terug.</strong>
              <p>
                De termijn start zodra je volledige intake, je betaling en de toegang tot je kanalen binnen zijn. WhatsApp valt
                erbuiten, omdat Meta dat eerst moet verifiëren. En de eerste 30 dagen na de livegang passen we kosteloos aan tot
                alles klopt.
              </p>
            </div>
          </section>

          <section id="rapport" aria-labelledby="h-rap">
            <p className="eyebrow">Maandrapport</p>
            <h2 id="h-rap">
              Elke maand zwart op wit <span className="hl">wat het oplevert.</span>
            </h2>
            <p className="lede" style={{ marginTop: 18 }}>
              Per kanaal apart: hoeveel vragen er binnenkwamen, hoeveel daarvan buiten je openingsuren, hoeveel mensen doorklikten
              om een consult te plannen, en welke vragen je receptioniste nog niet kon beantwoorden.
            </p>
            <div className="report">
              <div className="rep-head">
                <strong>Demokliniek · september</strong>
                <span>VOORBEELD · fictieve cijfers</span>
              </div>
              <div className="channels">
                {RAPPORT.map((r) => (
                  <div className="ch" key={r.kanaal}>
                    <h3>{r.kanaal}</h3>
                    <dl>
                      <dt>Gesprekken</dt>
                      <dd>{r.gesprekken}</dd>
                      <dt>Buiten openingsuren</dt>
                      <dd>{r.buiten}</dd>
                      <dt>Doorgeklikt naar agenda</dt>
                      <dd className="good">{r.agenda}</dd>
                      <dt>Doorgestuurd naar jou</dt>
                      <dd>{r.doorgestuurd}</dd>
                    </dl>
                  </div>
                ))}
              </div>
              <div className="unans">
                <strong>Niet kunnen beantwoorden: 5 vragen</strong>
                <ul>
                  <li>"Werken jullie ook met Profhilo?"</li>
                  <li>"Mag ik na een filler sporten?"</li>
                  <li>"Hebben jullie cadeaubonnen?"</li>
                </ul>
                <p>Vul deze antwoorden aan in je formulier, en volgende maand weet je receptioniste het wel.</p>
              </div>
              <p className="rep-foot">
                Bezoekersaantallen van je website kunnen erbij, als je ons toegang geeft tot je websitestatistieken.
              </p>
            </div>
          </section>

          <Pakketten />

          <section aria-labelledby="h-found">
            <div className="founding">
              <div>
                <p className="eyebrow">Founding clinics</p>
                <h2 id="h-found">
                  De eerste drie klinieken <span className="hl">krijgen meer.</span>
                </h2>
                <p className="lede" style={{ marginTop: 16 }}>
                  Je betaalt de gewone prijs, maar krijgt dit er gratis bij:
                </p>
                <ul className="bonus">
                  <li><span>Een 4e taal</span><span>€250</span></li>
                  <li><span>Instagram-startknoppen en keuzemenu op maat</span><span>inbegrepen</span></li>
                  <li><span>90 dagen wekelijks bijsturen</span><span>inbegrepen</span></li>
                  <li><span>Je maandprijs voor altijd vast, ook als prijzen stijgen</span><span>levenslang</span></li>
                </ul>
                <p className="seats">Nog 3 van 3 plaatsen</p>
              </div>
              <div className="give">
                <strong>Wat we van jou vragen</strong>
                <ul>
                  <li>Eerlijke feedback tijdens de eerste 90 dagen</li>
                  <li>Toestemming om je resultaten als case te tonen</li>
                  <li>Een korte review als je tevreden bent</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="faq" aria-labelledby="h-faq">
            <p className="eyebrow">Vragen</p>
            <h2 id="h-faq">Wat klinieken ons vragen.</h2>
            <div className="faq">
              {VRAGEN.map((q) => (
                <details key={q.v}>
                  <summary>{q.v}</summary>
                  <p>{q.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="final" aria-labelledby="h-final">
            <p className="eyebrow">Gratis demo</p>
            <h2 id="h-final">
              Zie jouw receptioniste <span className="hl">vóór je iets betaalt.</span>
            </h2>
            <p className="lede">
              Laat je website of Instagram achter. Wij bouwen een demo met jouw eigen info en sturen je de link.
            </p>
            <DemoAanvraag />
          </section>
        </main>

        <footer>
          <span>© 2026 Qore Aesthetics · een merk van QoreLabs (Qore LLC)</span>
          <nav aria-label="Voettekst">
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            <a href="/privacy">Privacy</a>
            <a href={INSTAGRAM_URL} rel="noopener" target="_blank">
              @qoreaesthetics
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
}

function DemoGesprek() {
  const [keuze, setKeuze] = useState<Keuze | null>(null);
  const gekozen = KEUZES.find((k) => k.id === keuze);

  return (
    <div className="phone" id="probeer" aria-label="Demo van een Instagram-gesprek">
      <div className="ph-head">
        <span className="ph-av" aria-hidden="true" />
        <div>
          <strong>Demokliniek</strong>
          <small>Instagram · antwoordt meteen</small>
        </div>
      </div>
      <div className="thread" aria-live="polite">
        <div className="t">Vandaag 21:47</div>
        <div className="msg in">Hoi! Wat kost een lipfiller bij jullie? En kan ik nog deze week?</div>
        <div className="msg out">
          Hoi! 👋 Een lipfiller (1 ml) kost bij ons €320. Deze week zijn er nog momenten vrij. Waarmee kan ik je helpen?
        </div>
        <div className="chips" role="group" aria-label="Keuzeknoppen">
          {KEUZES.map((k) => (
            <button
              key={k.id}
              type="button"
              className="chip"
              aria-pressed={keuze === k.id}
              onClick={() => setKeuze(k.id)}
            >
              {k.label}
            </button>
          ))}
        </div>
        {gekozen && (
          <>
            <div className="msg in">{gekozen.label}</div>
            <div className="msg out">{gekozen.antwoord}</div>
          </>
        )}
      </div>
      <p className="ph-note">Demo · fictieve kliniek en voorbeeldprijzen · klik op een knop</p>
    </div>
  );
}

function Pakketten() {
  const [jaar, setJaar] = useState(false);

  return (
    <section id="pakketten" aria-labelledby="h-pak">
      <p className="eyebrow">Pakketten</p>
      <h2 id="h-pak">
        Kies op basis van <span className="hl">je kliniek.</span>
      </h2>
      <div className="toggle-row">
        <div className="seg" role="group" aria-label="Contractduur">
          <button type="button" aria-pressed={!jaar} onClick={() => setJaar(false)}>
            Maand-tot-maand
          </button>
          <button type="button" aria-pressed={jaar} onClick={() => setJaar(true)}>
            Jaarcontract
          </button>
        </div>
        <div className="save" aria-live="polite">
          {jaar ? "Je bespaart 17% · 12 maanden, maandelijks betaald" : "Bespaar 17% met een jaarcontract"}
        </div>
      </div>
      <div className="plans">
        {PAKKETTEN.map((p) => (
          <article className={p.featured ? "plan featured" : "plan"} key={p.naam}>
            <div className="tag">{p.tag}</div>
            <h3>{p.naam}</h3>
            <p className="fit">{p.fit}</p>
            <div className="price">
              €{jaar ? p.jaar : p.maand} <small>/ maand</small>
            </div>
            <div className="setup">Eenmalige opstart €{jaar ? p.opstartJaar : p.opstartMaand}</div>
            <ul>
              {p.punten.map((punt) => (
                <li key={punt}>{punt}</li>
              ))}
            </ul>
            <a className={p.featured ? "btn primary" : "btn"} href="#aanvraag">
              Start met een gratis demo
            </a>
          </article>
        ))}
      </div>
      <div className="fair">
        <strong>Nooit een verrassing.</strong> Elk pakket is ruim genoeg voor een kliniek van die grootte. Groeit je kliniek
        erboven uit, dan verwittigen we je eerst en bekijken we samen de volgende stap. Je receptioniste valt nooit stil. Extra
        taal (bv. Duits of Turks) bij Start en Groei: eenmalig €250, inclusief vertaling en controle van al je info.
      </div>
    </section>
  );
}

type Status = "leeg" | "bezig" | "klaar" | "fout";

function DemoAanvraag() {
  const [status, setStatus] = useState<Status>("leeg");
  const [velden, setVelden] = useState({ kliniek: "", site: "", contact: "" });

  const zet = (naam: keyof typeof velden) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setVelden((v) => ({ ...v, [naam]: e.target.value }));

  async function verstuur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    setStatus("bezig");
    try {
      const antwoord = await fetch(DEMO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...velden, bron: "qoreaesthetics.com", taal: "nl" }),
      });
      setStatus(antwoord.ok ? "klaar" : "fout");
    } catch {
      setStatus("fout");
    }
  }

  if (status === "klaar") {
    return (
      <div className="demo-form" id="aanvraag">
        <p className="form-done" role="status">
          Bedankt! We bouwen je demo met de info van {velden.kliniek || "je kliniek"} en sturen je binnen 48 uur de link.
        </p>
      </div>
    );
  }

  const mailBody = encodeURIComponent(
    `Graag een gratis demo.\n\nKliniek: ${velden.kliniek}\nWebsite of Instagram: ${velden.site}\nContact: ${velden.contact}`,
  );

  return (
    <form className="demo-form" id="aanvraag" onSubmit={verstuur} noValidate>
      <label>
        Naam van je kliniek
        <input name="kliniek" autoComplete="organization" required value={velden.kliniek} onChange={zet("kliniek")} />
      </label>
      <label>
        Website of Instagram
        <input
          name="site"
          placeholder="jouwkliniek.be of @jouwkliniek"
          required
          value={velden.site}
          onChange={zet("site")}
        />
      </label>
      <label>
        E-mail of WhatsApp-nummer
        <input name="contact" required value={velden.contact} onChange={zet("contact")} />
      </label>
      <button className="btn primary" type="submit" disabled={status === "bezig"}>
        {status === "bezig" ? "Even geduld…" : "Bouw mijn gratis demo →"}
      </button>
      {status === "fout" && (
        <p className="form-error" role="alert">
          Dat lukte niet. Stuur je gegevens gerust{" "}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Gratis%20demo&body=${mailBody}`}>per e-mail</a>, dan bouwen we je demo
          zo.
        </p>
      )}
      <p className="form-note">Binnen 48 uur je demo. Geen betaalgegevens. Je spreekt altijd met Leno, de oprichter.</p>
    </form>
  );
}
