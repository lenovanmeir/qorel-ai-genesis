import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";

import aestheticsCss from "../styles/aesthetics.css?url";

// The clinic's personal demo link from the e-mail: qoreaesthetics.com/demo/<token>.
// n8n (workflow "Demopagina en versturen") checks the 7 days and the message limit.
const DEMO_URL = "https://qorelabs.app.n8n.cloud/webhook/qa-demo";
const CALL_URL = "https://cal.com/leno-qore/qore-aesthetics";
// The invitation card and the Cal.com prefill read two database functions that only answer to this demo's token.
const RPC_URL = "https://gqigmmezcmtwusgbdxny.supabase.co/rest/v1/rpc/";
const PUBLIEKE_SLEUTEL =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaWdtbWV6Y210d3VzZ2JkeG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjQxNjAsImV4cCI6MjEwNDM0MDE2MH0.D9CnIkNkaKOk7GfK1E7drEzu1z6Eoa-ZENml9yrFd28";
// The card shows after the 3rd message and, if dismissed with "Later", once more after the 8th.
const EERSTE_UITNODIGING = 3;
const TWEEDE_UITNODIGING = 8;

export const Route = createFileRoute("/demo/$token")({
  // ?nakijk=... is only in Leno's Telegram link: his test messages do not count.
  validateSearch: (zoek: Record<string, unknown>): { nakijk?: string } =>
    typeof zoek.nakijk === "string" && /^[0-9a-f]{32}$/.test(zoek.nakijk) ? { nakijk: zoek.nakijk } : {},
  head: () => ({
    meta: [
      { title: "Je demo-receptioniste · Qore Aesthetics" },
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
  component: DemoPagina,
});

type Taal = "nl" | "fr" | "en";
type Staat = "laden" | "actief" | "niet_actief" | "verlopen" | "op" | "niet_gevonden" | "fout";
type Bericht = { rol: "kliniek" | "receptioniste"; tekst: string };
type Info = {
  ok: boolean;
  staat?: Staat;
  kliniek?: string;
  taal?: Taal;
  resterend?: number;
  verloopt_op?: string | null;
  verlenging_gevraagd?: boolean;
  beheerder?: boolean;
};

type Uitnodiging = {
  kliniek?: string | null;
  website?: string | null;
  email?: string | null;
  max?: number | null;
  gebruikt?: number | null;
  geboekt?: boolean;
};

const LOCALE: Record<Taal, string> = { nl: "nl-BE", fr: "fr-BE", en: "en-GB" };

const TEKSTEN = {
  nl: {
    titel: (k: string) => `De demo-receptioniste van ${k}`,
    uitleg: "Stel een vraag zoals een patiënt dat zou doen. Ze antwoordt met de info van je website.",
    teller: (n: number, datum: string) => `Nog ${n} ${n === 1 ? "bericht" : "berichten"} · tot ${datum}`,
    start: (n: number) => `${n} berichten · 7 dagen vanaf je eerste vraag`,
    groet: (k: string) => `Hallo! Ik ben de AI-receptioniste van ${k}. Waarmee kan ik je helpen?`,
    voorbeelden: ["Welke behandelingen bieden jullie aan?", "Wat kost een behandeling?", "Waar zijn jullie gevestigd?"],
    plaats: "Typ je vraag…",
    stuur: "Verstuur",
    denkt: "Typt…",
    testmodus: "Testmodus voor Leno: deze berichten tellen niet mee.",
    laden: "Je demo wordt geladen…",
    nietGevonden: "Deze link klopt niet. Controleer de link in je mail.",
    nietActief: "Deze demo is nog niet geactiveerd. Je krijgt een mail zodra hij klaarstaat.",
    verlopen: "Je demo is afgelopen.",
    op: "Je hebt al je demoberichten gebruikt.",
    kiezen: "Wil je verder testen, of meteen bespreken hoe dit voor je kliniek werkt?",
    meerTijd: "Meer tijd vragen",
    afspraak: "Plan een gesprek met Leno",
    gevraagd: "Gevraagd! Je krijgt een mail zodra je demo verlengd is.",
    fout: "Er liep iets mis. Probeer het zo opnieuw.",
    gesprek: "Wil je dit voor je kliniek, of samen overlopen?",
    gesprekLink: "Plan een gesprek van 20 minuten met Leno →",
    uitnodiging: (k: string) =>
      `Bevalt ze? Dan zetten we deze receptioniste live voor ${k}, op jullie Instagram en website. Plan 20 minuten met Leno.`,
    uitnodigingKnop: "Plan een gesprek",
    later: "Later",
  },
  fr: {
    titel: (k: string) => `La réceptionniste démo de ${k}`,
    uitleg: "Posez une question comme le ferait un patient. Elle répond avec les informations de votre site.",
    teller: (n: number, datum: string) => `Encore ${n} message${n === 1 ? "" : "s"} · jusqu’au ${datum}`,
    start: (n: number) => `${n} messages · 7 jours à partir de votre première question`,
    groet: (k: string) => `Bonjour ! Je suis la réceptionniste IA de ${k}. Comment puis-je vous aider ?`,
    voorbeelden: ["Quels traitements proposez-vous ?", "Combien coûte un traitement ?", "Où êtes-vous situés ?"],
    plaats: "Écrivez votre question…",
    stuur: "Envoyer",
    denkt: "Écrit…",
    testmodus: "Mode test pour Leno : ces messages ne comptent pas.",
    laden: "Chargement de votre démo…",
    nietGevonden: "Ce lien n’est pas valide. Vérifiez le lien dans votre e-mail.",
    nietActief: "Cette démo n’est pas encore activée. Vous recevrez un e-mail dès qu’elle sera prête.",
    verlopen: "Votre démo est terminée.",
    op: "Vous avez utilisé tous vos messages de démo.",
    kiezen: "Vous voulez continuer à tester, ou voir directement comment cela fonctionnerait pour votre clinique ?",
    meerTijd: "Demander plus de temps",
    afspraak: "Planifier un appel avec Leno",
    gevraagd: "C’est demandé ! Vous recevrez un e-mail dès que votre démo sera prolongée.",
    fout: "Un problème est survenu. Réessayez dans un instant.",
    gesprek: "Vous voulez ceci pour votre clinique, ou la parcourir ensemble ?",
    gesprekLink: "Planifiez un appel de 20 minutes avec Leno →",
    uitnodiging: (k: string) =>
      `Elle vous plaît ? Alors nous pouvons mettre cette réceptionniste en ligne pour ${k}, sur votre Instagram et votre site web. Planifiez 20 minutes avec Leno.`,
    uitnodigingKnop: "Planifier un appel",
    later: "Plus tard",
  },
  en: {
    titel: (k: string) => `${k}'s demo receptionist`,
    uitleg: "Ask a question the way a patient would. She answers with the info from your website.",
    teller: (n: number, datum: string) => `${n} ${n === 1 ? "message" : "messages"} left · until ${datum}`,
    start: (n: number) => `${n} messages · 7 days from your first question`,
    groet: (k: string) => `Hi! I'm the AI receptionist of ${k}. How can I help you?`,
    voorbeelden: ["Which treatments do you offer?", "How much does a treatment cost?", "Where are you located?"],
    plaats: "Type your question…",
    stuur: "Send",
    denkt: "Typing…",
    testmodus: "Test mode for Leno: these messages don't count.",
    laden: "Loading your demo…",
    nietGevonden: "This link isn't valid. Check the link in your e-mail.",
    nietActief: "This demo isn't active yet. You'll get an e-mail as soon as it's ready.",
    verlopen: "Your demo has ended.",
    op: "You've used all your demo messages.",
    kiezen: "Want to keep testing, or talk about how this would work for your clinic?",
    meerTijd: "Ask for more time",
    afspraak: "Book a call with Leno",
    gevraagd: "Requested! You'll get an e-mail as soon as your demo is extended.",
    fout: "Something went wrong. Please try again in a moment.",
    gesprek: "Want this for your clinic, or go through it together?",
    gesprekLink: "Book a 20-minute call with Leno →",
    uitnodiging: (k: string) =>
      `Like it? Then we can take this receptionist live for ${k}, on your Instagram and website. Schedule 20 minutes with Leno.`,
    uitnodigingKnop: "Book a call",
    later: "Later",
  },
} satisfies Record<Taal, unknown>;

async function vraag(body: Record<string, unknown>): Promise<Record<string, unknown> & { ok?: boolean }> {
  const response = await fetch(DEMO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (response.status >= 500) throw new Error(`status ${response.status}`);
  return json;
}

async function rpc(functie: string, body: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(RPC_URL + functie, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: PUBLIEKE_SLEUTEL, Authorization: `Bearer ${PUBLIEKE_SLEUTEL}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`status ${response.status}`);
  return response.json().catch(() => null);
}

// Cal.com fills in the clinic's details and passes the demo token on to the booking,
// so the booking always lands on the right lead (Edge Function calcom).
function gesprekLink(token: string, u: Uitnodiging | null): string {
  const zoek = new URLSearchParams();
  if (u?.kliniek) zoek.set("kliniek", u.kliniek);
  if (u?.website) zoek.set("website", u.website);
  if (u?.email) zoek.set("email", u.email);
  zoek.set("metadata[demo]", token);
  return `${CALL_URL}?${zoek.toString()}`;
}

// How often the clinic clicked "Later" on this demo, remembered in this browser only.
const laterSleutel = (token: string) => `qa-demo-later-${token}`;
function leesLater(token: string): number {
  try {
    return Number(window.localStorage.getItem(laterSleutel(token)) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function bewaarLater(token: string, keer: number) {
  try {
    window.localStorage.setItem(laterSleutel(token), String(keer));
  } catch {
    // Private window or blocked storage: the card simply comes back on the next visit.
  }
}

function DemoPagina() {
  const { token } = Route.useParams();
  const { nakijk } = Route.useSearch();
  const [taal, setTaal] = useState<Taal>("nl");
  const [info, setInfo] = useState<Info | null>(null);
  const [staat, setStaat] = useState<Staat>("laden");
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const [gevraagd, setGevraagd] = useState(false);
  const [uitnodiging, setUitnodiging] = useState<Uitnodiging | null>(null);
  const [later, setLater] = useState(0);
  const getoondGelogd = useRef(false);
  const einde = useRef<HTMLDivElement>(null);
  const t = TEKSTEN[taal];

  useEffect(() => {
    setLater(leesLater(token));
    rpc("demo_uitnodiging", { p_token: token })
      .then((u) => setUitnodiging((u as Uitnodiging | null) ?? null))
      .catch(() => setUitnodiging(null));
  }, [token]);

  useEffect(() => {
    vraag({ actie: "info", token, nakijk })
      .then((antwoord) => {
        const i = antwoord as Info;
        if (!i.ok) {
          setStaat("niet_gevonden");
          return;
        }
        setInfo(i);
        if (i.taal) setTaal(i.taal);
        setGevraagd(!!i.verlenging_gevraagd);
        setStaat(i.staat ?? "fout");
      })
      .catch(() => setStaat("fout"));
  }, [token, nakijk]);

  useEffect(() => {
    einde.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [berichten, bezig]);

  const kliniek = info?.kliniek ?? "";
  const datum = info?.verloopt_op
    ? new Date(info.verloopt_op).toLocaleDateString(LOCALE[taal], { weekday: "long", day: "numeric", month: "long" })
    : "";

  // Messages used so far: from the database at load, then from the "remaining" count each answer brings.
  const max = uitnodiging?.max ?? null;
  const gebruikt =
    max !== null && typeof info?.resterend === "number" ? max - info.resterend : (uitnodiging?.gebruikt ?? 0);
  const drempel = later === 0 ? EERSTE_UITNODIGING : later === 1 ? TWEEDE_UITNODIGING : Infinity;
  const toonUitnodiging =
    staat === "actief" && !info?.beheerder && !nakijk && !uitnodiging?.geboekt && !!kliniek && gebruikt >= drempel;
  const afspraakUrl = gesprekLink(token, uitnodiging);

  useEffect(() => {
    if (!toonUitnodiging || getoondGelogd.current) return;
    getoondGelogd.current = true;
    void rpc("demo_uitnodiging_log", { p_token: token, p_soort: "getoond" }).catch(() => undefined);
  }, [toonUitnodiging, token]);

  const geklikt = () => {
    if (info?.beheerder || nakijk) return;
    void rpc("demo_uitnodiging_log", { p_token: token, p_soort: "geklikt" }).catch(() => undefined);
  };

  const laterKlik = () => {
    const keer = later + 1;
    bewaarLater(token, keer);
    setLater(keer);
  };

  async function stuur(tekst: string) {
    const bericht = tekst.trim();
    if (!bericht || bezig || staat !== "actief") return;
    const history = berichten.slice(-8).map((b) => ({ role: b.rol === "kliniek" ? "user" : "assistant", content: b.tekst }));
    setBerichten((b) => [...b, { rol: "kliniek", tekst: bericht }]);
    setInvoer("");
    setBezig(true);
    setMelding(null);
    try {
      const antwoord = await vraag({ actie: "bericht", token, nakijk, bericht, history, taal });
      if (antwoord.ok && typeof antwoord.antwoord === "string") {
        setBerichten((b) => [...b, { rol: "receptioniste", tekst: antwoord.antwoord as string }]);
        const resterend = typeof antwoord.resterend === "number" ? antwoord.resterend : info?.resterend;
        // The 7 days start with the first question, so the end date arrives with this answer.
        const verloopt = typeof antwoord.verloopt_op === "string" ? antwoord.verloopt_op : info?.verloopt_op;
        setInfo((i) => (i ? { ...i, resterend, verloopt_op: verloopt } : i));
        if (!info?.beheerder && resterend === 0) setStaat("op");
      } else if (typeof antwoord.staat === "string") {
        setStaat(antwoord.staat as Staat);
      } else {
        setMelding(t.fout);
      }
    } catch {
      setMelding(t.fout);
    } finally {
      setBezig(false);
    }
  }

  async function meerTijd() {
    try {
      const antwoord = await vraag({ actie: "verlengen", token });
      if (antwoord.ok) setGevraagd(true);
      else setMelding(t.fout);
    } catch {
      setMelding(t.fout);
    }
  }

  const verstuur = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void stuur(invoer);
  };

  return (
    <div className="qa">
      <div className="wrap demo-page">
        <nav className="top" aria-label="Qore Aesthetics">
          <span className="logo" aria-label="Qore Aesthetics">
            <span className="q" aria-hidden="true">Q</span>
            <span className="wm">
              QORE<small>AESTHETICS</small>
            </span>
          </span>
          <div className="lang-switch" role="group" aria-label="Taal / Langue / Language">
            {(["nl", "fr", "en"] as const).map((code) => (
              <button key={code} type="button" lang={code} aria-pressed={taal === code} onClick={() => setTaal(code)}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </nav>

        {staat === "laden" && <p className="demo-state">{t.laden}</p>}
        {staat === "niet_gevonden" && <p className="demo-state">{t.nietGevonden}</p>}
        {staat === "fout" && <p className="demo-state">{t.fout}</p>}
        {staat === "niet_actief" && <p className="demo-state">{t.nietActief}</p>}

        {kliniek && (staat === "actief" || staat === "verlopen" || staat === "op") && (
          <main className="demo-main">
            <header className="demo-head">
              <p className="eyebrow">Demo</p>
              <h1>{t.titel(kliniek)}</h1>
              <p className="lede">{t.uitleg}</p>
              {info?.beheerder ? (
                <p className="demo-test">{t.testmodus}</p>
              ) : (
                staat === "actief" && (
                  <p className="demo-count">
                    {datum ? t.teller(info?.resterend ?? 0, datum) : t.start(info?.resterend ?? 0)}
                  </p>
                )
              )}
            </header>

            <div className="demo-chat" aria-live="polite">
              <p className="bubble from-ai">{t.groet(kliniek)}</p>
              {berichten.map((b, i) => (
                <p key={i} className={`bubble ${b.rol === "kliniek" ? "from-me" : "from-ai"}`}>
                  {b.tekst}
                </p>
              ))}
              {bezig && <p className="bubble from-ai typing">{t.denkt}</p>}
              <div ref={einde} />
            </div>

            {staat === "actief" ? (
              <>
                {berichten.length === 0 && (
                  <div className="demo-suggest">
                    {t.voorbeelden.map((v) => (
                      <button key={v} type="button" className="chip" onClick={() => void stuur(v)} disabled={bezig}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
                {toonUitnodiging && (
                  <aside className="demo-invite" aria-live="polite">
                    <p>{t.uitnodiging(kliniek)}</p>
                    <div className="demo-choices">
                      <button className="btn" type="button" onClick={laterKlik}>
                        {t.later}
                      </button>
                      <a className="btn primary" href={afspraakUrl} target="_blank" rel="noopener" onClick={geklikt}>
                        {t.uitnodigingKnop}
                      </a>
                    </div>
                  </aside>
                )}
                <form className="demo-input" onSubmit={verstuur}>
                  <input
                    value={invoer}
                    onChange={(e) => setInvoer(e.target.value)}
                    placeholder={t.plaats}
                    maxLength={600}
                    aria-label={t.plaats}
                    disabled={bezig}
                  />
                  <button className="btn primary" type="submit" disabled={bezig || !invoer.trim()}>
                    {t.stuur}
                  </button>
                </form>
              </>
            ) : (
              <div className="demo-ended">
                <p>{staat === "op" ? t.op : t.verlopen}</p>
                <p className="lede">{t.kiezen}</p>
                <div className="demo-choices">
                  {gevraagd ? (
                    <p className="demo-count">{t.gevraagd}</p>
                  ) : (
                    <button className="btn" type="button" onClick={() => void meerTijd()}>
                      {t.meerTijd}
                    </button>
                  )}
                  <a className="btn primary" href={afspraakUrl} target="_blank" rel="noopener" onClick={geklikt}>
                    {t.afspraak}
                  </a>
                </div>
              </div>
            )}
            {melding && (
              <p className="form-error" role="alert">
                {melding}
              </p>
            )}

            <p className="form-call">
              {t.gesprek}{" "}
              <a className="call-link" href={afspraakUrl} target="_blank" rel="noopener" onClick={geklikt}>
                {t.gesprekLink}
              </a>
            </p>
          </main>
        )}
      </div>
    </div>
  );
}
