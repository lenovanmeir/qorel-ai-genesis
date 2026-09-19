import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OPTIES, TALEN, TEKSTEN, isTaal, type Optie, type Taal } from "@/lib/intake-teksten";

export const Route = createFileRoute("/intake/$code")({
  // De taal komt mee in de link (?taal=fr), zodat een Franstalige kliniek meteen in het Frans begint.
  validateSearch: (zoek: Record<string, unknown>): { taal?: Taal } => (isTaal(zoek.taal) ? { taal: zoek.taal } : {}),
  head: () => ({
    meta: [
      { title: "QoreLabs intake" },
      { name: "description", content: "Vragenlijst voor uw AI-receptionist." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: IntakePage,
});

// n8n bewaart de antwoorden en geeft ze terug, zodat de eigenaar op elk toestel verder kan.
const API_URL = "https://qorelabs.app.n8n.cloud/webhook/qore-intake";

type Vestiging = {
  naam: string;
  adres: string;
  openingstijden: string;
  contact: string;
  boekingslink: string;
  behandelingen: string;
};
type Behandeling = {
  naam: string;
  categorie: string;
  uitleg: string;
  duur: string;
  prijs: string;
  consultNodig: string;
  magVoorstellen: string;
};
type Consult = { naam: string; waarvoor: string; prijs: string; duur: string; vestigingen: string };
type VraagAntwoord = { vraag: string; antwoord: string };
type Promotie = { naam: string; van: string; tot: string; behandeling: string; aanbod: string; voorwaarden: string };

type Bedrijf = {
  naam: string; website: string; contact: string; email: string; telefoon: string;
  instagram: string; facebook: string; whatsapp: string; goedkeurder: string; talen: string[]; andereTaal: string;
};
type Afspraken = {
  verplichteGegevens: string[]; systeem: string; gebruikVoor: string[]; agendaToegang: string;
  zelfdeAgenda: string; minimumVooraf: string; buffer: string; zelfdeDag: string; consultVerplicht: string;
  nieuweKlanten: string; medewerkers: string; hoeVerVooruit: string; andereRegels: string;
};
type Faq = {
  voorbereiding: string; nazorg: string; pijn: string; resultaat: string; duur: string;
  prijsindicatie: string; nooit: string; vragen: VraagAntwoord[];
};

type Data = {
  bedrijf: Bedrijf;
  vestigingen: Vestiging[];
  categorieen: string;
  behandelingen: Behandeling[];
  behandelingenNiet: string;
  consulten: Consult[];
  naConsult: string;
  klanten: Record<string, string>;
  afspraken: Afspraken;
  annuleren: Record<string, string>;
  grenzen: { magZelfstandig: string[]; nooit: string };
  handoff: { situaties: string[]; liefstZelf: string; ontvangst: string; ontvangstAdres: string };
  commercieel: { magVoorstellen: string[]; nooit: string };
  toon: Record<string, string>;
  faq: Faq;
  systemen: Record<string, string>;
  promoties: Promotie[];
};

const leegVestiging = (): Vestiging => ({ naam: "", adres: "", openingstijden: "", contact: "", boekingslink: "", behandelingen: "" });
const leegBehandeling = (): Behandeling => ({ naam: "", categorie: "", uitleg: "", duur: "", prijs: "", consultNodig: "", magVoorstellen: "" });
const leegConsult = (): Consult => ({ naam: "", waarvoor: "", prijs: "", duur: "", vestigingen: "" });
const leegVraag = (): VraagAntwoord => ({ vraag: "", antwoord: "" });
const leegPromotie = (): Promotie => ({ naam: "", van: "", tot: "", behandeling: "", aanbod: "", voorwaarden: "" });

const leegData = (): Data => ({
  bedrijf: { naam: "", website: "", contact: "", email: "", telefoon: "", instagram: "", facebook: "", whatsapp: "", goedkeurder: "", talen: [], andereTaal: "" },
  vestigingen: [leegVestiging()],
  categorieen: "",
  behandelingen: [leegBehandeling()],
  behandelingenNiet: "",
  consulten: [leegConsult()],
  naConsult: "",
  klanten: { extraInfo: "", wekelijkseVragen: "", uitzonderingen: "", klantreis: "" },
  afspraken: {
    verplichteGegevens: [], systeem: "", gebruikVoor: [], agendaToegang: "", zelfdeAgenda: "", minimumVooraf: "",
    buffer: "", zelfdeDag: "", consultVerplicht: "", nieuweKlanten: "", medewerkers: "", hoeVerVooruit: "", andereRegels: "",
  },
  annuleren: { termijn: "", kost: "", binnen24: "", noShow: "", voorschot: "", uitzonderingen: "", medewerker: "", ziekte: "" },
  grenzen: { magZelfstandig: [], nooit: "" },
  handoff: { situaties: [], liefstZelf: "", ontvangst: "", ontvangstAdres: "" },
  commercieel: { magVoorstellen: [], nooit: "" },
  toon: { stijl: "", aanspreekvorm: "", woorden: "", gesprekkenDelen: "" },
  faq: { voorbereiding: "", nazorg: "", pijn: "", resultaat: "", duur: "", prijsindicatie: "", nooit: "", vragen: [leegVraag(), leegVraag(), leegVraag()] },
  systemen: { agenda: "", crm: "", website: "", email: "", betalingen: "", andere: "" },
  promoties: [],
});

function Veld({ label, waarde, zet, hint, regels = 1, plaats }: {
  label: string; waarde: string; zet: (v: string) => void; hint?: string; regels?: number; plaats?: string;
}) {
  const klas =
    "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none ring-ring transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2";
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {regels > 1 ? (
        <textarea rows={regels} value={waarde} onChange={(e) => zet(e.target.value)} placeholder={plaats} className={klas} />
      ) : (
        <input type="text" value={waarde} onChange={(e) => zet(e.target.value)} placeholder={plaats} className={klas} />
      )}
    </label>
  );
}

const chipKlas = (actief: boolean) =>
  `rounded-full border px-4 py-2 text-sm transition-colors ${
    actief
      ? "border-primary bg-primary/15 text-foreground"
      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
  }`;

// De knop toont de vertaalde tekst, maar bewaart altijd de Nederlandse waarde.
function Keuze({ label, opties, taal, waarde, zet, hint }: {
  label: string; opties: Optie[]; taal: Taal; waarde: string; zet: (v: string) => void; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      <div className="flex flex-wrap gap-2">
        {opties.map((o) => (
          <button key={o.w} type="button" onClick={() => zet(waarde === o.w ? "" : o.w)} className={chipKlas(waarde === o.w)}>
            {o.l[taal]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Vinkjes({ label, opties, taal, waarden, zet, hint }: {
  label: string; opties: Optie[]; taal: Taal; waarden: string[]; zet: (v: string[]) => void; hint?: string;
}) {
  const wissel = (w: string) => zet(waarden.includes(w) ? waarden.filter((x) => x !== w) : [...waarden, w]);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      <div className="flex flex-wrap gap-2">
        {opties.map((o) => (
          <button key={o.w} type="button" onClick={() => wissel(o.w)} className={chipKlas(waarden.includes(o.w))}>
            {o.l[taal]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Blok({ titel, kanWeg, weg, wegTekst, children }: {
  titel: string; kanWeg: boolean; weg: () => void; wegTekst: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">{titel}</span>
        {kanWeg && (
          <button type="button" onClick={weg} className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline">
            {wegTekst}
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Toevoegen({ tekst, klik }: { tekst: string; klik: () => void }) {
  return (
    <button
      type="button"
      onClick={klik}
      className="w-full rounded-xl border border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10"
    >
      + {tekst}
    </button>
  );
}

function TaalKiezer({ taal, kies }: { taal: Taal; kies: (t: Taal) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border p-1">
      {TALEN.map((t) => (
        <button
          key={t.code}
          type="button"
          onClick={() => kies(t.code)}
          aria-pressed={taal === t.code}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            taal === t.code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.naam}
        </button>
      ))}
    </div>
  );
}

function Voettekst({ t }: { t: (typeof TEKSTEN)[Taal] }) {
  return (
    <footer className="mt-8 flex flex-col gap-1 border-t border-border pt-5 text-xs text-muted-foreground">
      <p>{t.vragen}</p>
      <p>
        {t.privacy}{" "}
        <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
          {t.privacyLink}
        </a>
      </p>
    </footer>
  );
}

function IntakePage() {
  const { code } = Route.useParams();
  const { taal: taalUitLink } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const taal: Taal = taalUitLink ?? "nl";
  const t = TEKSTEN[taal];
  const kiesTaal = (nieuw: Taal) => navigate({ search: { taal: nieuw }, replace: true });

  const [stap, setStap] = useState(0);
  const [data, setData] = useState<Data>(leegData());
  const [bewaard, setBewaard] = useState<string | null>(null);
  const [verzenden, setVerzenden] = useState(false);
  const [verzonden, setVerzonden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [opServer, setOpServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [opslaan, setOpslaan] = useState(false);
  const [bijgewerkt, setBijgewerkt] = useState<{ gelukt: boolean; om: string } | null>(null);
  const geladen = useRef(false);
  // Wat de chatbot nu gebruikt, om te zien of er iets gewijzigd is dat nog niet opgeslagen werd.
  const laatstOpgeslagen = useRef<string | null>(null);

  // Eerst wat op dit toestel staat, daarna de bewaarde versie van de server (die telt).
  useEffect(() => {
    let gestopt = false;
    try {
      const opgeslagen = localStorage.getItem(`qore-intake-${code}`);
      if (opgeslagen) setData({ ...leegData(), ...JSON.parse(opgeslagen) });
    } catch {
      // Geen opgeslagen versie of geen toegang: we starten gewoon leeg.
    }
    (async () => {
      try {
        const response = await fetch(`${API_URL}?code=${encodeURIComponent(code)}`);
        if (!response.ok) throw new Error(`status ${response.status}`);
        const gevonden = await response.json();
        if (!gestopt && gevonden?.intake) {
          setServerStatus(gevonden.intake.status ?? null);
        }
        if (!gestopt && gevonden?.intake?.data) {
          const vanServer = { ...leegData(), ...gevonden.intake.data };
          setData(vanServer);
          laatstOpgeslagen.current = JSON.stringify(vanServer);
          setOpServer(true);
        }
      } catch {
        // Geen verbinding of nog niets bewaard: verder met wat op dit toestel staat.
      } finally {
        geladen.current = true;
      }
    })();
    return () => {
      gestopt = true;
    };
  }, [code]);

  useEffect(() => {
    if (!geladen.current) return;
    try {
      localStorage.setItem(`qore-intake-${code}`, JSON.stringify(data));
      setBewaard(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch {
      // Bewaren kan mislukken in een privévenster; het formulier blijft gewoon werken.
    }
  }, [data, code]);

  const zet = <K extends keyof Data>(sleutel: K, waarde: Data[K]) => setData((d) => ({ ...d, [sleutel]: waarde }));
  const zetVeld = (sectie: "bedrijf" | "klanten" | "afspraken" | "annuleren" | "toon" | "faq" | "systemen", veld: string, waarde: string) =>
    setData((d) => ({ ...d, [sectie]: { ...(d[sectie] as Record<string, unknown>), [veld]: waarde } }) as Data);

  // Heeft de kliniek al eens verstuurd, dan werkt "Opslaan" voortaan meteen de AI-receptionist bij.
  const alVerstuurd = serverStatus === "ingevuld" || serverStatus === "gebouwd" || serverStatus === "live";
  const nietOpgeslagen = alVerstuurd && laatstOpgeslagen.current !== null && laatstOpgeslagen.current !== JSON.stringify(data);

  const bewaarOpServer = async (soort: "tussendoor" | "versturen") => {
    const body =
      soort === "tussendoor"
        ? { code, data }
        : { code, data, bijwerken: true, ...(alVerstuurd ? {} : { status: "ingevuld" }) };
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    setOpServer(true);
    return (await response.json().catch(() => ({}))) as { bijgewerkt?: boolean | null; leeg?: boolean };
  };

  // Bij elke stap bewaren we tussentijds, zodat niets verloren gaat bij het sluiten van het venster.
  const naarStap = (nieuw: number) => {
    setStap(nieuw);
    if (geladen.current) bewaarOpServer("tussendoor").catch(() => setOpServer(false));
  };

  const versturen = async () => {
    setVerzenden(true);
    setFout(null);
    try {
      const antwoord = await bewaarOpServer("versturen");
      if (antwoord.leeg) {
        setFout(t.leeg);
        return;
      }
      laatstOpgeslagen.current = JSON.stringify(data);
      setServerStatus("ingevuld");
      setVerzonden(true);
    } catch {
      setFout(t.foutVersturen);
    } finally {
      setVerzenden(false);
    }
  };

  const opslaanEnBijwerken = async () => {
    setOpslaan(true);
    setFout(null);
    setBijgewerkt(null);
    try {
      const antwoord = await bewaarOpServer("versturen");
      if (antwoord.leeg) {
        setFout(t.leeg);
        return;
      }
      laatstOpgeslagen.current = JSON.stringify(data);
      setBijgewerkt({
        gelukt: antwoord.bijgewerkt === true,
        om: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } catch {
      setFout(t.foutOpslaan);
    } finally {
      setOpslaan(false);
    }
  };

  if (verzonden) {
    return (
      <main lang={taal} className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-5 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">{t.bedanktTitel}</h1>
        <p className="text-sm text-muted-foreground">{t.bedanktTekst}</p>
        <p className="text-sm text-muted-foreground">{t.bedanktLater}</p>
        <Voettekst t={t} />
      </main>
    );
  }

  const laatste = stap === STAPPEN_AANTAL - 1;
  const naam = data.bedrijf.naam.trim();

  return (
    <main lang={taal} className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <header className="mb-6 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">QoreLabs intake</span>
          <TaalKiezer taal={taal} kies={kiesTaal} />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {naam ? t.titelMetNaam(naam) : t.titel}
        </h1>
        <p className="text-sm text-muted-foreground">{alVerstuurd ? t.uitlegBewerken : t.uitlegNieuw}</p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {t.stappen.map((stapNaam, i) => (
          <button
            key={i}
            type="button"
            onClick={() => naarStap(i)}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              i === stap ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {i + 1}. {stapNaam}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <h2 className="mb-5 font-display text-lg font-semibold text-foreground">
          {stap + 1}. {t.stappen[stap]}
        </h2>

        {stap === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Veld label={t.bedrijfsnaam} waarde={data.bedrijf.naam} zet={(v) => zetVeld("bedrijf", "naam", v)} />
            <Veld label={t.website} waarde={data.bedrijf.website} zet={(v) => zetVeld("bedrijf", "website", v)} plaats="https://" />
            <Veld label={t.contactpersoon} waarde={data.bedrijf.contact} zet={(v) => zetVeld("bedrijf", "contact", v)} />
            <Veld label={t.email} waarde={data.bedrijf.email} zet={(v) => zetVeld("bedrijf", "email", v)} />
            <Veld label={t.telefoon} waarde={data.bedrijf.telefoon} zet={(v) => zetVeld("bedrijf", "telefoon", v)} />
            <Veld label={t.instagram} waarde={data.bedrijf.instagram} zet={(v) => zetVeld("bedrijf", "instagram", v)} plaats="@" />
            <Veld label={t.facebook} waarde={data.bedrijf.facebook} zet={(v) => zetVeld("bedrijf", "facebook", v)} />
            <Veld label={t.whatsapp} waarde={data.bedrijf.whatsapp} zet={(v) => zetVeld("bedrijf", "whatsapp", v)} />
            <Veld label={t.goedkeurder} waarde={data.bedrijf.goedkeurder} zet={(v) => zetVeld("bedrijf", "goedkeurder", v)} />
            <div className="sm:col-span-2 grid gap-3">
              <Vinkjes
                label={t.talen}
                opties={OPTIES.talen}
                taal={taal}
                waarden={data.bedrijf.talen}
                zet={(v) => setData((d) => ({ ...d, bedrijf: { ...d.bedrijf, talen: v } }))}
              />
              <Veld
                label={t.andereTaal}
                hint={t.andereTaalHint}
                plaats={t.andereTaalPlaats}
                waarde={data.bedrijf.andereTaal}
                zet={(v) => setData((d) => ({ ...d, bedrijf: { ...d.bedrijf, andereTaal: v } }))}
              />
            </div>
          </div>
        )}

        {stap === 1 && (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">{t.vestigingenIntro}</p>
            {data.vestigingen.map((v, i) => (
              <Blok
                key={i}
                titel={t.vestiging(i + 1)}
                kanWeg={data.vestigingen.length > 1}
                wegTekst={t.verwijderen}
                weg={() => zet("vestigingen", data.vestigingen.filter((_, j) => j !== i))}
              >
                {([
                  [t.naam, "naam"],
                  [t.adres, "adres"],
                  [t.openingstijden, "openingstijden"],
                  [t.telefoonOfEmail, "contact"],
                  [t.boekingslink, "boekingslink"],
                  [t.behandelingenHier, "behandelingen"],
                ] as const).map(([label, veld]) => (
                  <Veld
                    key={veld}
                    label={label}
                    waarde={v[veld]}
                    zet={(nieuw) => zet("vestigingen", data.vestigingen.map((x, j) => (i === j ? { ...x, [veld]: nieuw } : x)))}
                  />
                ))}
              </Blok>
            ))}
            <Toevoegen tekst={t.vestigingToevoegen} klik={() => zet("vestigingen", [...data.vestigingen, leegVestiging()])} />
          </div>
        )}

        {stap === 2 && (
          <div className="grid gap-5">
            <Veld label={t.categorieen} hint={t.categorieenHint} waarde={data.categorieen} zet={(v) => zet("categorieen", v)} regels={2} />
            <div className="grid gap-4">
              {data.behandelingen.map((b, i) => (
                <Blok
                  key={i}
                  titel={t.behandeling(i + 1)}
                  kanWeg={data.behandelingen.length > 1}
                  wegTekst={t.verwijderen}
                  weg={() => zet("behandelingen", data.behandelingen.filter((_, j) => j !== i))}
                >
                  {([
                    [t.naam, "naam"],
                    [t.categorie, "categorie"],
                    [t.uitleg, "uitleg"],
                    [t.duur, "duur"],
                    [t.prijs, "prijs"],
                    [t.consultNodig, "consultNodig"],
                    [t.magVoorstellenDeze, "magVoorstellen"],
                  ] as const).map(([label, veld]) => (
                    <Veld
                      key={veld}
                      label={label}
                      waarde={b[veld]}
                      regels={veld === "uitleg" ? 2 : 1}
                      zet={(nieuw) => zet("behandelingen", data.behandelingen.map((x, j) => (i === j ? { ...x, [veld]: nieuw } : x)))}
                    />
                  ))}
                </Blok>
              ))}
              <Toevoegen tekst={t.behandelingToevoegen} klik={() => zet("behandelingen", [...data.behandelingen, leegBehandeling()])} />
            </div>
            <Veld label={t.behandelingenNiet} waarde={data.behandelingenNiet} zet={(v) => zet("behandelingenNiet", v)} regels={2} />
            <div className="grid gap-4">
              {data.consulten.map((c, i) => (
                <Blok
                  key={i}
                  titel={t.consult(i + 1)}
                  kanWeg={data.consulten.length > 1}
                  wegTekst={t.verwijderen}
                  weg={() => zet("consulten", data.consulten.filter((_, j) => j !== i))}
                >
                  {([
                    [t.consultNaam, "naam"],
                    [t.waarvoor, "waarvoor"],
                    [t.gratisOfPrijs, "prijs"],
                    [t.duur, "duur"],
                    [t.opVestigingen, "vestigingen"],
                  ] as const).map(([label, veld]) => (
                    <Veld
                      key={veld}
                      label={label}
                      waarde={c[veld]}
                      zet={(nieuw) => zet("consulten", data.consulten.map((x, j) => (i === j ? { ...x, [veld]: nieuw } : x)))}
                    />
                  ))}
                </Blok>
              ))}
              <Toevoegen tekst={t.consultToevoegen} klik={() => zet("consulten", [...data.consulten, leegConsult()])} />
            </div>
            <Veld label={t.naConsult} hint={t.naConsultHint} waarde={data.naConsult} zet={(v) => zet("naConsult", v)} regels={2} />
          </div>
        )}

        {stap === 3 && (
          <div className="grid gap-5">
            <Vinkjes
              label={t.verplichteGegevens}
              opties={OPTIES.verplichteGegevens}
              taal={taal}
              waarden={data.afspraken.verplichteGegevens}
              zet={(v) => setData((d) => ({ ...d, afspraken: { ...d.afspraken, verplichteGegevens: v } }))}
            />
            <Veld label={t.systeem} waarde={data.afspraken.systeem} zet={(v) => zetVeld("afspraken", "systeem", v)} />
            <Keuze
              label={t.agendaToegang}
              hint={t.agendaToegangHint}
              opties={OPTIES.agendaToegang}
              taal={taal}
              waarde={data.afspraken.agendaToegang}
              zet={(v) => zetVeld("afspraken", "agendaToegang", v)}
            />
            <Veld label={t.minimumVooraf} waarde={data.afspraken.minimumVooraf} zet={(v) => zetVeld("afspraken", "minimumVooraf", v)} />
            <Veld label={t.buffer} waarde={data.afspraken.buffer} zet={(v) => zetVeld("afspraken", "buffer", v)} />
            <Keuze label={t.zelfdeDag} opties={OPTIES.jaNee} taal={taal} waarde={data.afspraken.zelfdeDag} zet={(v) => zetVeld("afspraken", "zelfdeDag", v)} />
            <Veld label={t.consultVerplicht} waarde={data.afspraken.consultVerplicht} zet={(v) => zetVeld("afspraken", "consultVerplicht", v)} regels={2} />
            <Veld label={t.hoeVerVooruit} waarde={data.afspraken.hoeVerVooruit} zet={(v) => zetVeld("afspraken", "hoeVerVooruit", v)} />
            <Veld label={t.andereRegels} waarde={data.afspraken.andereRegels} zet={(v) => zetVeld("afspraken", "andereRegels", v)} regels={2} />
            <Veld label={t.annuleerTermijn} waarde={data.annuleren.termijn} zet={(v) => zetVeld("annuleren", "termijn", v)} />
            <Veld label={t.annuleerKost} waarde={data.annuleren.kost} zet={(v) => zetVeld("annuleren", "kost", v)} regels={2} />
            <Veld label={t.noShow} waarde={data.annuleren.noShow} zet={(v) => zetVeld("annuleren", "noShow", v)} regels={2} />
            <Veld label={t.voorschot} waarde={data.annuleren.voorschot} zet={(v) => zetVeld("annuleren", "voorschot", v)} />
            <Veld label={t.medewerkerAnnuleren} waarde={data.annuleren.medewerker} zet={(v) => zetVeld("annuleren", "medewerker", v)} regels={2} />
          </div>
        )}

        {stap === 4 && (
          <div className="grid gap-5">
            <Vinkjes
              label={t.magZelfstandig}
              opties={OPTIES.magZelfstandig}
              taal={taal}
              waarden={data.grenzen.magZelfstandig}
              zet={(v) => setData((d) => ({ ...d, grenzen: { ...d.grenzen, magZelfstandig: v } }))}
            />
            <Veld label={t.nooitZelfstandig} waarde={data.grenzen.nooit} zet={(v) => setData((d) => ({ ...d, grenzen: { ...d.grenzen, nooit: v } }))} regels={2} />
            <Vinkjes
              label={t.situaties}
              opties={OPTIES.situaties}
              taal={taal}
              waarden={data.handoff.situaties}
              zet={(v) => setData((d) => ({ ...d, handoff: { ...d.handoff, situaties: v } }))}
            />
            <Keuze
              label={t.ontvangst}
              opties={OPTIES.ontvangst}
              taal={taal}
              waarde={data.handoff.ontvangst}
              zet={(v) => setData((d) => ({ ...d, handoff: { ...d.handoff, ontvangst: v } }))}
            />
            <Veld label={t.ontvangstAdres} waarde={data.handoff.ontvangstAdres} zet={(v) => setData((d) => ({ ...d, handoff: { ...d.handoff, ontvangstAdres: v } }))} />
            <Vinkjes
              label={t.magVoorstellen}
              opties={OPTIES.magVoorstellen}
              taal={taal}
              waarden={data.commercieel.magVoorstellen}
              zet={(v) => setData((d) => ({ ...d, commercieel: { ...d.commercieel, magVoorstellen: v } }))}
            />
            <Veld label={t.commercieelNooit} waarde={data.commercieel.nooit} zet={(v) => setData((d) => ({ ...d, commercieel: { ...d.commercieel, nooit: v } }))} regels={2} />
          </div>
        )}

        {stap === 5 && (
          <div className="grid gap-5">
            <Keuze label={t.stijl} opties={OPTIES.stijl} taal={taal} waarde={data.toon.stijl} zet={(v) => zetVeld("toon", "stijl", v)} />
            <Keuze
              label={t.aanspreekvorm}
              hint={t.aanspreekvormHint}
              opties={OPTIES.aanspreekvorm}
              taal={taal}
              waarde={data.toon.aanspreekvorm}
              zet={(v) => zetVeld("toon", "aanspreekvorm", v)}
            />
            <Veld label={t.woorden} waarde={data.toon.woorden} zet={(v) => zetVeld("toon", "woorden", v)} regels={2} />
            <div className="grid gap-3">
              <p className="text-sm font-medium text-foreground">{t.faqTitel}</p>
              <p className="text-xs text-muted-foreground">{t.faqHint}</p>
              {([
                [t.faqVoorbereiding, "voorbereiding"],
                [t.faqNazorg, "nazorg"],
                [t.faqPijn, "pijn"],
                [t.faqResultaat, "resultaat"],
                [t.faqDuur, "duur"],
                [t.faqPrijsindicatie, "prijsindicatie"],
                [t.faqNooit, "nooit"],
              ] as const).map(([label, veld]) => (
                <Veld key={veld} label={label} waarde={data.faq[veld] as string} zet={(v) => zetVeld("faq", veld, v)} regels={2} />
              ))}
            </div>
            <div className="grid gap-3">
              <p className="text-sm font-medium text-foreground">{t.wekelijks}</p>
              {data.faq.vragen.map((v, i) => (
                <Blok
                  key={i}
                  titel={t.vraagN(i + 1)}
                  kanWeg={data.faq.vragen.length > 1}
                  wegTekst={t.verwijderen}
                  weg={() => setData((d) => ({ ...d, faq: { ...d.faq, vragen: d.faq.vragen.filter((_, j) => j !== i) } }))}
                >
                  <Veld label={t.vraag} waarde={v.vraag} zet={(nieuw) => setData((d) => ({ ...d, faq: { ...d.faq, vragen: d.faq.vragen.map((x, j) => (i === j ? { ...x, vraag: nieuw } : x)) } }))} />
                  <Veld label={t.antwoordTeam} waarde={v.antwoord} regels={2} zet={(nieuw) => setData((d) => ({ ...d, faq: { ...d.faq, vragen: d.faq.vragen.map((x, j) => (i === j ? { ...x, antwoord: nieuw } : x)) } }))} />
                </Blok>
              ))}
              <Toevoegen tekst={t.vraagToevoegen} klik={() => setData((d) => ({ ...d, faq: { ...d.faq, vragen: [...d.faq.vragen, leegVraag()] } }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                [t.sysAgenda, "agenda"],
                [t.sysCrm, "crm"],
                [t.sysWebsite, "website"],
                [t.sysEmail, "email"],
                [t.sysBetalingen, "betalingen"],
                [t.sysAndere, "andere"],
              ] as const).map(([label, veld]) => (
                <Veld key={veld} label={label} waarde={data.systemen[veld]} zet={(v) => zetVeld("systemen", veld, v)} />
              ))}
            </div>
            <div className="grid gap-3">
              <p className="text-sm font-medium text-foreground">{t.promoties}</p>
              <p className="text-xs text-muted-foreground">{t.promotiesHint}</p>
              {data.promoties.map((p, i) => (
                <Blok key={i} titel={t.promotie(i + 1)} kanWeg wegTekst={t.verwijderen} weg={() => zet("promoties", data.promoties.filter((_, j) => j !== i))}>
                  {([
                    [t.naam, "naam"],
                    [t.geldigVan, "van"],
                    [t.geldigTot, "tot"],
                    [t.voorBehandeling, "behandeling"],
                    [t.aanbod, "aanbod"],
                    [t.voorwaarden, "voorwaarden"],
                  ] as const).map(([label, veld]) => (
                    <Veld key={veld} label={label} waarde={p[veld]} zet={(nieuw) => zet("promoties", data.promoties.map((x, j) => (i === j ? { ...x, [veld]: nieuw } : x)))} />
                  ))}
                </Blok>
              ))}
              <Toevoegen tekst={t.promotieToevoegen} klik={() => zet("promoties", [...data.promoties, leegPromotie()])} />
            </div>
          </div>
        )}

        {stap === 6 && (
          <div className="grid gap-5">
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">{t.nakijkenIntro}</p>
              <div className="grid gap-2 rounded-2xl border border-border bg-background/60 p-4 text-sm">
                <p><span className="text-muted-foreground">{t.sBedrijf}:</span> {data.bedrijf.naam || t.nogNietIngevuld}</p>
                <p><span className="text-muted-foreground">{t.sVestigingen}:</span> {data.vestigingen.filter((v) => v.naam).length}</p>
                <p><span className="text-muted-foreground">{t.sBehandelingen}:</span> {data.behandelingen.filter((b) => b.naam).length}</p>
                <p><span className="text-muted-foreground">{t.sConsulten}:</span> {data.consulten.filter((c) => c.naam).length}</p>
                <p><span className="text-muted-foreground">{t.sFaq}:</span> {data.faq.vragen.filter((v) => v.vraag).length}</p>
                <p>
                  <span className="text-muted-foreground">{t.sAanspreekvorm}:</span>{" "}
                  {OPTIES.aanspreekvorm.find((o) => o.w === data.toon.aanspreekvorm)?.l[taal] ?? t.nogNietGekozen}
                </p>
              </div>
            </div>
            <Veld label={t.extraInfo} waarde={data.klanten.extraInfo} zet={(v) => zetVeld("klanten", "extraInfo", v)} regels={3} />
            {fout && <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{fout}</p>}
            <button
              type="button"
              onClick={alVerstuurd ? opslaanEnBijwerken : versturen}
              disabled={verzenden}
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {alVerstuurd ? (opslaan ? t.opslaanBezig : t.opslaan) : verzenden ? t.versturenBezig : t.versturen}
            </button>
          </div>
        )}
      </div>

      {bijgewerkt && (
        <p
          className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
            bijgewerkt.gelukt
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "border-amber-500/30 bg-amber-500/10 text-foreground"
          }`}
        >
          {bijgewerkt.gelukt ? t.bijgewerkt(bijgewerkt.om) : t.nietBijgewerkt(bijgewerkt.om)}
        </p>
      )}
      {fout && !laatste && (
        <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{fout}</p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => naarStap(Math.max(0, stap - 1))}
          disabled={stap === 0}
          className="rounded-full border border-border px-5 py-2.5 text-sm text-foreground transition-colors hover:border-primary disabled:opacity-40"
        >
          {t.vorige}
        </button>
        <span className={`text-center text-xs ${nietOpgeslagen ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
          {nietOpgeslagen
            ? t.gewijzigd
            : opServer
            ? t.bewaardServer(bewaard ?? "")
            : bewaard
            ? t.bewaardToestel(bewaard)
            : t.blijftBewaard}
        </span>
        <div className="flex items-center gap-2">
          {alVerstuurd && !laatste && (
            <button
              type="button"
              onClick={opslaanEnBijwerken}
              disabled={opslaan}
              className="rounded-full border border-primary px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              {opslaan ? t.opslaanBezig : t.opslaan}
            </button>
          )}
          <button
            type="button"
            onClick={() => naarStap(Math.min(STAPPEN_AANTAL - 1, stap + 1))}
            disabled={laatste}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {t.volgende}
          </button>
        </div>
      </div>

      <Voettekst t={t} />
    </main>
  );
}

const STAPPEN_AANTAL = TEKSTEN.nl.stappen.length;
