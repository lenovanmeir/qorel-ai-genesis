import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";

import aestheticsCss from "../styles/aesthetics.css?url";

// The clinic's personal demo link from the e-mail: qoreaesthetics.com/demo/<token>.
// n8n (workflow "Demopagina en versturen") checks the 7 days and the message limit.
const DEMO_URL = "https://qorelabs.app.n8n.cloud/webhook/qa-demo";
const CALL_URL = "https://cal.com/leno-qore/qore-aesthetics";

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

const LOCALE: Record<Taal, string> = { nl: "nl-BE", fr: "fr-BE", en: "en-GB" };

const TEKSTEN = {
  nl: {
    titel: (k: string) => `De demo-receptioniste van ${k}`,
    uitleg: "Stel een vraag zoals een patiënt dat zou doen. Ze antwoordt met de info van je website.",
    teller: (n: number, datum: string) => `Nog ${n} ${n === 1 ? "bericht" : "berichten"} · tot ${datum}`,
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
    meerTijd: "Meer tijd vragen",
    gevraagd: "Gevraagd! Je krijgt een mail zodra je demo verlengd is.",
    fout: "Er liep iets mis. Probeer het zo opnieuw.",
    gesprek: "Wil je dit voor je kliniek, of samen overlopen?",
    gesprekLink: "Plan een gesprek van 20 minuten met Leno →",
  },
  fr: {
    titel: (k: string) => `La réceptionniste démo de ${k}`,
    uitleg: "Posez une question comme le ferait un patient. Elle répond avec les informations de votre site.",
    teller: (n: number, datum: string) => `Encore ${n} message${n === 1 ? "" : "s"} · jusqu’au ${datum}`,
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
    meerTijd: "Demander plus de temps",
    gevraagd: "C’est demandé ! Vous recevrez un e-mail dès que votre démo sera prolongée.",
    fout: "Un problème est survenu. Réessayez dans un instant.",
    gesprek: "Vous voulez ceci pour votre clinique, ou la parcourir ensemble ?",
    gesprekLink: "Planifiez un appel de 20 minutes avec Leno →",
  },
  en: {
    titel: (k: string) => `${k}'s demo receptionist`,
    uitleg: "Ask a question the way a patient would. She answers with the info from your website.",
    teller: (n: number, datum: string) => `${n} ${n === 1 ? "message" : "messages"} left · until ${datum}`,
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
    meerTijd: "Ask for more time",
    gevraagd: "Requested! You'll get an e-mail as soon as your demo is extended.",
    fout: "Something went wrong. Please try again in a moment.",
    gesprek: "Want this for your clinic, or go through it together?",
    gesprekLink: "Book a 20-minute call with Leno →",
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
  const einde = useRef<HTMLDivElement>(null);
  const t = TEKSTEN[taal];

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
        setInfo((i) => (i ? { ...i, resterend } : i));
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
                staat === "actief" && datum && <p className="demo-count">{t.teller(info?.resterend ?? 0, datum)}</p>
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
                {gevraagd ? (
                  <p className="demo-count">{t.gevraagd}</p>
                ) : (
                  <button className="btn primary" type="button" onClick={() => void meerTijd()}>
                    {t.meerTijd}
                  </button>
                )}
              </div>
            )}
            {melding && (
              <p className="form-error" role="alert">
                {melding}
              </p>
            )}

            <p className="form-call">
              {t.gesprek}{" "}
              <a className="call-link" href={CALL_URL} target="_blank" rel="noopener">
                {t.gesprekLink}
              </a>
            </p>
          </main>
        )}
      </div>
    </div>
  );
}
