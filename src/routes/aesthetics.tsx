import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import aestheticsCss from "../styles/aesthetics.css?url";
import { useI18n } from "@/i18n/I18nProvider";
import { LANGS } from "@/i18n/translations";
import { AESTHETICS_TEKSTEN } from "@/lib/aesthetics-teksten";

// Served at the root of qoreaesthetics.com through the hostname rewrite in router.tsx.
const SITE_URL = "https://qoreaesthetics.com/";
const DEMO_URL = "https://qorelabs.app.n8n.cloud/webhook/qa-demo-aanvraag";
const SUPPORT_EMAIL = "support@qorelabs.io";
// Intro call with Leno; a secondary path next to the demo for owners who want to talk first.
const CALL_URL = "https://cal.com/leno-qore/qore-aesthetics";
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
      { property: "og:locale:alternate", content: "fr_BE" },
      { property: "og:locale:alternate", content: "en_GB" },
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

// Prices are the same in every language; only their formatting differs.
const PRIJZEN = [
  { naam: "Start", maand: 239, jaar: 199, opstartMaand: 950, opstartJaar: 700, featured: false },
  { naam: "Groei", maand: 419, jaar: 349, opstartMaand: 1450, opstartJaar: 1200, featured: true },
  { naam: "Compleet", maand: 659, jaar: 549, opstartMaand: 1950, opstartJaar: 1700, featured: false },
];

const RAPPORT = [
  { kanaal: "Instagram", gesprekken: 84, buiten: 47, agenda: 19, doorgestuurd: 3 },
  { kanaal: "WhatsApp", gesprekken: 52, buiten: 21, agenda: 11, doorgestuurd: 2 },
  { kanaal: "website", gesprekken: 31, buiten: 12, agenda: 6, doorgestuurd: 1 },
];

function useTeksten() {
  const { lang } = useI18n();
  return AESTHETICS_TEKSTEN[lang];
}

function euro(bedrag: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

function AestheticsHome() {
  const t = useTeksten();

  return (
    <div className="qa">
      <div className="wrap">
        <nav className="top" aria-label={t.nav.menu}>
          <a className="logo" href="#top" aria-label="Qore Aesthetics">
            <span className="q" aria-hidden="true">Q</span>
            <span className="wm">
              QORE<small>AESTHETICS</small>
            </span>
          </a>
          <div className="links">
            <a href="#hoe">{t.nav.how}</a>
            <a href="#rapport">{t.nav.report}</a>
            <a href="#pakketten">{t.nav.packages}</a>
            <a href="#faq">{t.nav.faq}</a>
          </div>
          <div className="nav-end">
            <TaalKeuze />
            <a className="btn primary" href="#aanvraag">
              {t.nav.cta}
            </a>
          </div>
        </nav>

        <main>
          <header className="hero" id="top">
            <div>
              <span className="stamp">21:47</span>
              <h1>
                {t.hero.h1a} <span className="hl">{t.hero.h1b}</span>
                <span className="soft">{t.hero.soft}</span>
              </h1>
              <p className="lede">{t.hero.lede}</p>
              <div className="ctas">
                <a className="btn primary" href="#aanvraag">
                  {t.hero.ctaPrimary}
                </a>
                <a className="btn" href="#probeer">
                  {t.hero.ctaSecondary}
                </a>
              </div>
              <div className="micro">
                {t.hero.micro.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
            <DemoGesprek />
          </header>

          <div className="facts" aria-label={t.facts.label}>
            {t.facts.items.map((f) => (
              <div key={f.b}>
                <b>{f.b}</b>
                <span>{f.span}</span>
              </div>
            ))}
          </div>

          <section aria-labelledby="h-pain">
            <p className="eyebrow">{t.pain.eyebrow}</p>
            <h2 id="h-pain">
              {t.pain.h2a} <span className="hl">{t.pain.h2b}</span>
            </h2>
            <div className="pains">
              {t.pain.items.map((p) => (
                <div className="pain" key={p.stamp}>
                  <span className="stamp">{p.stamp}</span>
                  <q>{p.vraag}</q>
                  <p>{p.tekst}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="hoe" aria-labelledby="h-hoe">
            <p className="eyebrow">{t.how.eyebrow}</p>
            <h2 id="h-hoe">
              {t.how.h2a} <span className="hl">{t.how.h2b}</span>
            </h2>
            <ol className="steps">
              {t.how.steps.map((s, i) => (
                <li key={s.h}>
                  <span className="step-label">
                    {t.how.stepLabel} {i + 1}
                  </span>
                  <h3>{s.h}</h3>
                  <p>{s.p}</p>
                </li>
              ))}
            </ol>
            <div className="guarantee">
              <strong>{t.how.guaranteeTitle}</strong>
              <p>{t.how.guaranteeText}</p>
            </div>
          </section>

          <section id="rapport" aria-labelledby="h-rap">
            <p className="eyebrow">{t.report.eyebrow}</p>
            <h2 id="h-rap">
              {t.report.h2a} <span className="hl">{t.report.h2b}</span>
            </h2>
            <p className="lede" style={{ marginTop: 18 }}>
              {t.report.lede}
            </p>
            <div className="report">
              <div className="rep-head">
                <strong>{t.report.head}</strong>
                <span>{t.report.sample}</span>
              </div>
              <div className="channels">
                {RAPPORT.map((r) => (
                  <div className="ch" key={r.kanaal}>
                    <h3>{r.kanaal === "website" ? t.report.website : r.kanaal}</h3>
                    <dl>
                      <dt>{t.report.rows.gesprekken}</dt>
                      <dd>{r.gesprekken}</dd>
                      <dt>{t.report.rows.buiten}</dt>
                      <dd>{r.buiten}</dd>
                      <dt>{t.report.rows.agenda}</dt>
                      <dd className="good">{r.agenda}</dd>
                      <dt>{t.report.rows.doorgestuurd}</dt>
                      <dd>{r.doorgestuurd}</dd>
                    </dl>
                  </div>
                ))}
              </div>
              <div className="unans">
                <strong>{t.report.unansTitle}</strong>
                <ul>
                  {t.report.unansItems.map((v) => (
                    <li key={v}>"{v}"</li>
                  ))}
                </ul>
                <p>{t.report.unansText}</p>
              </div>
              <p className="rep-foot">{t.report.foot}</p>
            </div>
          </section>

          <Pakketten />

          <section aria-labelledby="h-found">
            <div className="founding">
              <div>
                <p className="eyebrow">{t.founding.eyebrow}</p>
                <h2 id="h-found">
                  {t.founding.h2a} <span className="hl">{t.founding.h2b}</span>
                </h2>
                <p className="lede" style={{ marginTop: 16 }}>
                  {t.founding.lede}
                </p>
                <ul className="bonus">
                  {t.founding.bonus.map((b) => (
                    <li key={b.l}>
                      <span>{b.l}</span>
                      <span>{b.r}</span>
                    </li>
                  ))}
                </ul>
                <p className="seats">{t.founding.seats}</p>
              </div>
              <div className="give">
                <strong>{t.founding.giveTitle}</strong>
                <ul>
                  {t.founding.give.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section id="faq" aria-labelledby="h-faq">
            <p className="eyebrow">{t.faq.eyebrow}</p>
            <h2 id="h-faq">{t.faq.h2}</h2>
            <div className="faq">
              {t.faq.items.map((q) => (
                <details key={q.v}>
                  <summary>{q.v}</summary>
                  <p>
                    {q.a}{" "}
                    {q.link && (
                      <a className="call-link" href={CALL_URL} target="_blank" rel="noopener">
                        {q.link}
                      </a>
                    )}
                  </p>
                </details>
              ))}
            </div>
          </section>

          <section className="final" aria-labelledby="h-final">
            <p className="eyebrow">{t.final.eyebrow}</p>
            <h2 id="h-final">
              {t.final.h2a} <span className="hl">{t.final.h2b}</span>
            </h2>
            <p className="lede">{t.final.lede}</p>
            <DemoAanvraag />
          </section>
        </main>

        <footer>
          <span>{t.footer.copy}</span>
          <nav aria-label={t.footer.nav}>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            <a href="/privacy">{t.footer.privacy}</a>
            <a href={INSTAGRAM_URL} rel="noopener" target="_blank">
              @qoreaesthetics
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
}

function TaalKeuze() {
  const { lang, setLang } = useI18n();
  const t = AESTHETICS_TEKSTEN[lang];

  return (
    <div className="lang-switch" role="group" aria-label={t.nav.lang}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          aria-label={l.label}
          aria-pressed={lang === l.code}
          onClick={() => setLang(l.code)}
        >
          {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function DemoGesprek() {
  const t = useTeksten();
  const [keuze, setKeuze] = useState<string | null>(null);
  const gekozen = t.demo.keuzes.find((k) => k.id === keuze);

  return (
    <div className="phone" id="probeer" aria-label={t.demo.aria}>
      <div className="ph-head">
        <span className="ph-av" aria-hidden="true" />
        <div>
          <strong>{t.demo.clinic}</strong>
          <small>{t.demo.sub}</small>
        </div>
      </div>
      <div className="thread" aria-live="polite">
        <div className="t">{t.demo.today}</div>
        <div className="msg in">{t.demo.msgIn}</div>
        <div className="msg out">{t.demo.msgOut}</div>
        <div className="chips" role="group" aria-label={t.demo.chipsLabel}>
          {t.demo.keuzes.map((k) => (
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
      <p className="ph-note">{t.demo.note}</p>
    </div>
  );
}

function Pakketten() {
  const t = useTeksten();
  const [jaar, setJaar] = useState(false);

  return (
    <section id="pakketten" aria-labelledby="h-pak">
      <p className="eyebrow">{t.packages.eyebrow}</p>
      <h2 id="h-pak">
        {t.packages.h2a} <span className="hl">{t.packages.h2b}</span>
      </h2>
      <div className="toggle-row">
        <div className="seg" role="group" aria-label={t.packages.duration}>
          <button type="button" aria-pressed={!jaar} onClick={() => setJaar(false)}>
            {t.packages.monthly}
          </button>
          <button type="button" aria-pressed={jaar} onClick={() => setJaar(true)}>
            {t.packages.yearly}
          </button>
        </div>
        <div className="save" aria-live="polite">
          {jaar ? t.packages.saveYearly : t.packages.saveMonthly}
        </div>
      </div>
      <div className="plans">
        {PRIJZEN.map((p, i) => {
          const tekst = t.packages.plans[i];
          return (
            <article className={p.featured ? "plan featured" : "plan"} key={p.naam}>
              <div className="tag">{tekst.tag}</div>
              <h3>{p.naam}</h3>
              <p className="fit">{tekst.fit}</p>
              <div className="price">
                {euro(jaar ? p.jaar : p.maand, t.locale)} <small>{t.packages.perMonth}</small>
              </div>
              <div className="setup">
                {t.packages.setup} {euro(jaar ? p.opstartJaar : p.opstartMaand, t.locale)}
              </div>
              <ul>
                {tekst.punten.map((punt) => (
                  <li key={punt}>{punt}</li>
                ))}
              </ul>
              <a className={p.featured ? "btn primary" : "btn"} href="#aanvraag">
                {t.packages.cta}
              </a>
            </article>
          );
        })}
      </div>
      <div className="fair">
        <strong>{t.packages.fairTitle}</strong> {t.packages.fairText}
      </div>
    </section>
  );
}

type Status = "leeg" | "bezig" | "klaar" | "fout";

function DemoAanvraag() {
  const { lang } = useI18n();
  const t = AESTHETICS_TEKSTEN[lang];
  const [status, setStatus] = useState<Status>("leeg");
  const [velden, setVelden] = useState({ kliniek: "", website: "", instagram: "", email: "", telefoon: "" });
  // Hidden from people, but bots fill it in; the n8n workflow drops those requests.
  const [bedrijfsadres, setBedrijfsadres] = useState("");

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
        body: JSON.stringify({ ...velden, bedrijfsadres, bron: "qoreaesthetics.com", taal: lang }),
      });
      setStatus(antwoord.ok ? "klaar" : "fout");
    } catch {
      setStatus("fout");
    }
  }

  // Cal.com fills in the booking form from these, so the clinic does not type everything twice.
  const belLink = `${CALL_URL}?${new URLSearchParams({
    email: velden.email,
    kliniek: velden.kliniek,
    website: velden.website,
  }).toString()}`;

  if (status === "klaar") {
    return (
      <div className="demo-form" id="aanvraag">
        <p className="form-done" role="status">
          {t.form.done(velden.kliniek)}
        </p>
        <a className="call-link center" href={belLink} target="_blank" rel="noopener">
          {t.form.doneCall}
        </a>
      </div>
    );
  }

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t.form.mailSubject)}&body=${encodeURIComponent(
    t.form.mailBody(velden),
  )}`;

  return (
    <form className="demo-form" id="aanvraag" onSubmit={verstuur} noValidate>
      <label>
        {t.form.kliniek}
        <input name="kliniek" autoComplete="organization" required value={velden.kliniek} onChange={zet("kliniek")} />
      </label>
      <div className="form-row">
        <label>
          {t.form.website}
          <input
            name="website"
            inputMode="url"
            autoComplete="url"
            required
            placeholder={t.form.websitePlaceholder}
            value={velden.website}
            onChange={zet("website")}
          />
        </label>
        <label>
          <span>
            {t.form.instagram} <small>({t.form.optioneel})</small>
          </span>
          <input
            name="instagram"
            placeholder="@"
            value={velden.instagram}
            onChange={zet("instagram")}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          {t.form.email}
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t.form.emailPlaceholder}
            value={velden.email}
            onChange={zet("email")}
          />
        </label>
        <label>
          <span>
            {t.form.telefoon} <small>({t.form.optioneel})</small>
          </span>
          <input name="telefoon" type="tel" autoComplete="tel" value={velden.telefoon} onChange={zet("telefoon")} />
        </label>
      </div>
      <label className="hp" aria-hidden="true">
        Bedrijfsadres
        <input
          name="bedrijfsadres"
          tabIndex={-1}
          autoComplete="off"
          value={bedrijfsadres}
          onChange={(e) => setBedrijfsadres(e.target.value)}
        />
      </label>
      <button className="btn primary" type="submit" disabled={status === "bezig"}>
        {status === "bezig" ? t.form.busy : t.form.submit}
      </button>
      {status === "fout" && (
        <p className="form-error" role="alert">
          {t.form.errorA} <a href={mailto}>{t.form.errorLink}</a>
          {t.form.errorB}
        </p>
      )}
      <p className="form-note">{t.form.note}</p>
      <p className="form-call">
        {t.form.callA}{" "}
        <a className="call-link" href={CALL_URL} target="_blank" rel="noopener">
          {t.form.callLink}
        </a>
      </p>
    </form>
  );
}
