import { useCallback, useEffect, useState } from "react";

// The Supabase function "onboarding": every new client (Stripe payment or added by hand) with its checklist.
const ONBOARDING_URL = "https://gqigmmezcmtwusgbdxny.supabase.co/functions/v1/onboarding";

type Klant = {
  id: string;
  bron: "stripe" | "handmatig";
  pakket: string | null;
  contract: "maand" | "jaar" | null;
  kliniek_naam: string;
  website: string | null;
  email: string | null;
  taal: "nl" | "fr" | "en";
  intake_code: string | null;
  intake_link: string | null;
  intake_status: string | null;
  opstart_betaald_op: string | null;
  welkomstmail_op: string | null;
  widget_aan: boolean | null;
  kanalen: string[];
  fout: string | null;
  aangemaakt_op: string;
};

type Voorbeeld = { aan: string | null; onderwerp: string; tekst: string };

const veld =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2";
const knop =
  "rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary disabled:opacity-50";
const hoofdknop =
  "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50";

const datum = (iso: string) =>
  new Date(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "short" });

// The steps from payment to live, in order. The 4 working days start once the first three are done.
function stappen(k: Klant) {
  const intakeKlaar = ["ingevuld", "gebouwd", "live"].includes(k.intake_status ?? "");
  return [
    { klaar: true, tekst: k.bron === "stripe" ? "Abonnement betaald" : "Toegevoegd" },
    { klaar: !!k.welkomstmail_op, tekst: "Welkomstmail met vragenlijst" },
    { klaar: !!k.opstart_betaald_op, tekst: "Opstart betaald (Wise)" },
    { klaar: intakeKlaar, tekst: "Vragenlijst ingevuld" },
    { klaar: ["gebouwd", "live"].includes(k.intake_status ?? ""), tekst: "Chatbot gebouwd" },
    { klaar: !!k.widget_aan || k.kanalen.length > 0, tekst: "Kanaal gekoppeld" },
    { klaar: k.intake_status === "live", tekst: "Live" },
  ];
}

export function KlantenBeheer({
  sleutel,
  bijgewerkt,
}: {
  sleutel: string;
  bijgewerkt: () => void;
}) {
  const [klanten, setKlanten] = useState<Klant[]>([]);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<Record<string, string>>({});
  const [voorbeeld, setVoorbeeld] = useState<Record<string, Voorbeeld>>({});
  const [nieuw, setNieuw] = useState({
    kliniek_naam: "",
    website: "",
    email: "",
    taal: "nl",
    pakket: "",
    contract: "maand",
  });
  const [toevoegen, setToevoegen] = useState(false);

  const zegt = (id: string, tekst: string) => setMelding((m) => ({ ...m, [id]: tekst }));

  const vraag = useCallback(
    async (body?: unknown) => {
      const antwoord = await fetch(ONBOARDING_URL, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", "x-beheercode": sleutel },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await antwoord.json().catch(() => ({}));
      if (!antwoord.ok) throw new Error(data?.fout ?? `status ${antwoord.status}`);
      return data;
    },
    [sleutel],
  );

  const ophalen = useCallback(async () => {
    try {
      setKlanten((await vraag()).klanten);
      setFout(null);
    } catch (e) {
      setFout(`De klanten laden lukte niet (${e instanceof Error ? e.message : "onbekend"}).`);
    }
  }, [vraag]);

  useEffect(() => {
    ophalen();
  }, [ophalen]);

  const klantToevoegen = async () => {
    if (!nieuw.kliniek_naam.trim()) return;
    setBezig("nieuw");
    try {
      const data = await vraag({ handmatig: { ...nieuw, pakket: nieuw.pakket || null } });
      setMelding((m) => ({
        ...m,
        nieuw: data.klant?.fout
          ? `Toegevoegd, maar: ${data.klant.fout}`
          : "Toegevoegd. Kliniek, login, widget en intake staan klaar.",
      }));
      setNieuw({
        kliniek_naam: "",
        website: "",
        email: "",
        taal: "nl",
        pakket: "",
        contract: "maand",
      });
      setToevoegen(false);
      await ophalen();
      bijgewerkt();
    } catch (e) {
      zegt("nieuw", e instanceof Error ? e.message : "Toevoegen lukte niet");
    } finally {
      setBezig(null);
    }
  };

  const opstart = async (k: Klant) => {
    setBezig(k.id);
    try {
      await vraag({ opstart: { id: k.id, betaald: !k.opstart_betaald_op } });
      await ophalen();
    } catch (e) {
      zegt(k.id, e instanceof Error ? e.message : "Bewaren lukte niet");
    } finally {
      setBezig(null);
    }
  };

  const mail = async (k: Klant, versturen: boolean) => {
    setBezig(k.id);
    try {
      const data = await vraag({ welkomstmail: { id: k.id, versturen } });
      if (versturen) {
        zegt(k.id, `Welkomstmail verstuurd naar ${data.aan}.`);
        setVoorbeeld((v) => {
          const rest = { ...v };
          delete rest[k.id];
          return rest;
        });
        await ophalen();
        bijgewerkt();
      } else {
        setVoorbeeld((v) => ({ ...v, [k.id]: data }));
      }
    } catch (e) {
      zegt(k.id, e instanceof Error ? e.message : "Mislukt");
    } finally {
      setBezig(null);
    }
  };

  return (
    <section className="mb-7 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Nieuwe klanten</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Na een betaling via Stripe staan kliniek, login, widget en vragenlijst hier vanzelf
            klaar. U kijkt de vragenlijst na en verstuurt de welkomstmail.
          </p>
        </div>
        <button type="button" className={knop} onClick={() => setToevoegen((v) => !v)}>
          {toevoegen ? "Sluiten" : "Klant toevoegen zonder Stripe"}
        </button>
      </div>
      {fout && <p className="mt-3 text-sm text-destructive">{fout}</p>}
      {melding.nieuw && <p className="mt-3 text-sm text-muted-foreground">{melding.nieuw}</p>}

      {toevoegen && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-background p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Naam van de kliniek
            <input
              className={veld}
              value={nieuw.kliniek_naam}
              onChange={(e) => setNieuw({ ...nieuw, kliniek_naam: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Website (dan vult de AI de vragenlijst alvast in)
            <input
              className={veld}
              value={nieuw.website}
              placeholder="https://"
              onChange={(e) => setNieuw({ ...nieuw, website: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            E-mailadres voor de welkomstmail
            <input
              className={veld}
              type="email"
              value={nieuw.email}
              onChange={(e) => setNieuw({ ...nieuw, email: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Taal
            <select
              className={veld}
              value={nieuw.taal}
              onChange={(e) => setNieuw({ ...nieuw, taal: e.target.value })}
            >
              <option value="nl">Nederlands</option>
              <option value="fr">Frans</option>
              <option value="en">Engels</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Pakket
            <select
              className={veld}
              value={nieuw.pakket}
              onChange={(e) => setNieuw({ ...nieuw, pakket: e.target.value })}
            >
              <option value="">Nog niet gekozen</option>
              <option value="Start">Start</option>
              <option value="Groei">Groei</option>
              <option value="Compleet">Compleet</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Contract
            <select
              className={veld}
              value={nieuw.contract}
              onChange={(e) => setNieuw({ ...nieuw, contract: e.target.value })}
            >
              <option value="maand">Maandelijks opzegbaar</option>
              <option value="jaar">Jaarcontract</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              className={hoofdknop}
              disabled={!nieuw.kliniek_naam.trim() || bezig === "nieuw"}
              onClick={klantToevoegen}
            >
              {bezig === "nieuw" ? "Bezig… (tot een minuut)" : "Klant aanmaken"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {klanten.length === 0 && !fout && (
          <p className="text-sm text-muted-foreground">Nog geen nieuwe klanten.</p>
        )}
        {klanten.map((k) => (
          <article key={k.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium text-foreground">{k.kliniek_naam}</p>
              <p className="text-xs text-muted-foreground">
                {[
                  k.pakket,
                  k.contract === "jaar"
                    ? "jaarcontract"
                    : k.contract === "maand"
                      ? "maandelijks"
                      : null,
                  k.email,
                  datum(k.aangemaakt_op),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {k.fout && <p className="mt-2 text-sm text-destructive">⚠️ {k.fout}</p>}

            <ol className="mt-3 flex flex-wrap gap-1.5">
              {stappen(k).map((s) => (
                <li
                  key={s.tekst}
                  className={`rounded-full px-3 py-1 text-xs ${
                    s.klaar
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {s.klaar ? "✓ " : ""}
                  {s.tekst}
                </li>
              ))}
            </ol>

            <div className="mt-3 flex flex-wrap gap-2">
              {k.intake_link && (
                <a className={knop} href={k.intake_link} target="_blank" rel="noreferrer">
                  Vragenlijst nakijken
                </a>
              )}
              {!k.welkomstmail_op && k.intake_code && (
                <button
                  type="button"
                  className={hoofdknop}
                  disabled={bezig === k.id}
                  onClick={() => mail(k, false)}
                >
                  Welkomstmail bekijken
                </button>
              )}
              <button
                type="button"
                className={knop}
                disabled={bezig === k.id}
                onClick={() => opstart(k)}
              >
                {k.opstart_betaald_op ? "Opstart toch niet betaald" : "Opstart is betaald"}
              </button>
            </div>
            {melding[k.id] && <p className="mt-3 text-sm text-muted-foreground">{melding[k.id]}</p>}

            {voorbeeld[k.id] && (
              <div className="mt-4 rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">
                  Aan: {voorbeeld[k.id].aan ?? "geen e-mailadres"}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {voorbeeld[k.id].onderwerp}
                </p>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-foreground">
                  {voorbeeld[k.id].tekst}
                </pre>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={hoofdknop}
                    disabled={bezig === k.id || !voorbeeld[k.id].aan}
                    onClick={() => mail(k, true)}
                  >
                    Versturen
                  </button>
                  <button
                    type="button"
                    className={knop}
                    onClick={() => navigator.clipboard?.writeText(voorbeeld[k.id].tekst)}
                  >
                    Tekst kopiëren (zelf versturen)
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
