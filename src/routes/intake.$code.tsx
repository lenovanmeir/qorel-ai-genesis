import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/intake/$code")({
  head: () => ({
    meta: [
      { title: "QoreLabs intake" },
      { name: "description", content: "Vragenlijst voor uw AI-receptionist." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: IntakePage,
});

const SUBMIT_URL = "https://qorelabs.app.n8n.cloud/webhook/qore-intake";

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

const STAPPEN = [
  "Bedrijf en kanalen",
  "Vestigingen",
  "Behandelingen en consulten",
  "Afspraken en annuleren",
  "Grenzen en overdracht",
  "Toon, vragen en systemen",
  "Nakijken en versturen",
];

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

function Keuze({ label, opties, waarde, zet, hint }: {
  label: string; opties: string[]; waarde: string; zet: (v: string) => void; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      <div className="flex flex-wrap gap-2">
        {opties.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => zet(waarde === o ? "" : o)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              waarde === o
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Vinkjes({ label, opties, waarden, zet, hint }: {
  label: string; opties: string[]; waarden: string[]; zet: (v: string[]) => void; hint?: string;
}) {
  const wissel = (o: string) => zet(waarden.includes(o) ? waarden.filter((w) => w !== o) : [...waarden, o]);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      <div className="flex flex-wrap gap-2">
        {opties.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => wissel(o)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              waarden.includes(o)
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Blok({ titel, kanWeg, weg, children }: { titel: string; kanWeg: boolean; weg: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">{titel}</span>
        {kanWeg && (
          <button type="button" onClick={weg} className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline">
            Verwijderen
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

function IntakePage() {
  const { code } = Route.useParams();
  const [stap, setStap] = useState(0);
  const [data, setData] = useState<Data>(leegData());
  const [bewaard, setBewaard] = useState<string | null>(null);
  const [verzenden, setVerzenden] = useState(false);
  const [verzonden, setVerzonden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const geladen = useRef(false);

  // De antwoorden blijven op dit apparaat staan, zodat de eigenaar later verder kan.
  useEffect(() => {
    try {
      const opgeslagen = localStorage.getItem(`qore-intake-${code}`);
      if (opgeslagen) setData({ ...leegData(), ...JSON.parse(opgeslagen) });
    } catch {
      // Geen opgeslagen versie of geen toegang: we starten gewoon leeg.
    }
    geladen.current = true;
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

  const versturen = async () => {
    setVerzenden(true);
    setFout(null);
    try {
      const response = await fetch(SUBMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ingevuld_op: new Date().toISOString(), data }),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      setVerzonden(true);
    } catch {
      setFout("Versturen lukte niet. Probeer het zo nog eens, of mail ons dat het niet lukt. Uw antwoorden blijven bewaard op dit apparaat.");
    } finally {
      setVerzenden(false);
    }
  };

  if (verzonden) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-5 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">Bedankt, we hebben alles ontvangen</h1>
        <p className="text-sm text-muted-foreground">
          We bouwen uw AI-receptionist en testen hem op alle kanalen. Daarna krijgt u hem zelf te zien om uit te proberen. Pas na uw
          goedkeuring gaat hij live. Ontbreekt er nog iets, dan nemen we contact met u op.
        </p>
      </main>
    );
  }

  const laatste = stap === STAPPEN.length - 1;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <header className="mb-6 flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">QoreLabs intake</span>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Vragenlijst voor uw AI-receptionist
        </h1>
        <p className="text-sm text-muted-foreground">
          Invullen duurt ongeveer 30 minuten. U kunt tussendoor stoppen: uw antwoorden blijven bewaard op dit apparaat en u gaat later
          gewoon verder via dezelfde link. Weet u iets niet zeker, laat het dan open. Wij vullen niets zelf in en de AI verzint nooit iets.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STAPPEN.map((naam, i) => (
          <button
            key={naam}
            type="button"
            onClick={() => setStap(i)}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              i === stap ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {i + 1}. {naam}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <h2 className="mb-5 font-display text-lg font-semibold text-foreground">
          {stap + 1}. {STAPPEN[stap]}
        </h2>

        {stap === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Veld label="Bedrijfsnaam" waarde={data.bedrijf.naam} zet={(v) => zetVeld("bedrijf", "naam", v)} />
            <Veld label="Website" waarde={data.bedrijf.website} zet={(v) => zetVeld("bedrijf", "website", v)} plaats="https://" />
            <Veld label="Contactpersoon" waarde={data.bedrijf.contact} zet={(v) => zetVeld("bedrijf", "contact", v)} />
            <Veld label="E-mail" waarde={data.bedrijf.email} zet={(v) => zetVeld("bedrijf", "email", v)} />
            <Veld label="Telefoon" waarde={data.bedrijf.telefoon} zet={(v) => zetVeld("bedrijf", "telefoon", v)} />
            <Veld label="Instagram-account" waarde={data.bedrijf.instagram} zet={(v) => zetVeld("bedrijf", "instagram", v)} plaats="@" />
            <Veld label="Facebook-pagina" waarde={data.bedrijf.facebook} zet={(v) => zetVeld("bedrijf", "facebook", v)} />
            <Veld label="WhatsApp-nummer" waarde={data.bedrijf.whatsapp} zet={(v) => zetVeld("bedrijf", "whatsapp", v)} />
            <Veld label="Wie keurt de teksten goed?" waarde={data.bedrijf.goedkeurder} zet={(v) => zetVeld("bedrijf", "goedkeurder", v)} />
            <div className="sm:col-span-2 grid gap-3">
              <Vinkjes
                label="In welke talen moet de AI antwoorden?"
                opties={["Nederlands", "Frans", "Engels"]}
                waarden={data.bedrijf.talen}
                zet={(v) => setData((d) => ({ ...d, bedrijf: { ...d.bedrijf, talen: v } }))}
              />
              <Veld
                label="Andere taal"
                hint="Spreekt u klanten ook in een andere taal aan, vul die hier in. Andere talen bespreken we samen."
                plaats="Bijvoorbeeld Spaans of Duits"
                waarde={data.bedrijf.andereTaal}
                zet={(v) => setData((d) => ({ ...d, bedrijf: { ...d.bedrijf, andereTaal: v } }))}
              />
            </div>
          </div>
        )}

        {stap === 1 && (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">Vul één blok in per vestiging. Klik onderaan om er een toe te voegen.</p>
            {data.vestigingen.map((v, i) => (
              <Blok
                key={i}
                titel={`Vestiging ${i + 1}`}
                kanWeg={data.vestigingen.length > 1}
                weg={() => zet("vestigingen", data.vestigingen.filter((_, j) => j !== i))}
              >
                {([
                  ["Naam", "naam"],
                  ["Adres", "adres"],
                  ["Openingstijden", "openingstijden"],
                  ["Telefoon of e-mail", "contact"],
                  ["Boekingslink of agenda", "boekingslink"],
                  ["Welke behandelingen hier", "behandelingen"],
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
            <Toevoegen tekst="Vestiging toevoegen" klik={() => zet("vestigingen", [...data.vestigingen, leegVestiging()])} />
          </div>
        )}

        {stap === 2 && (
          <div className="grid gap-5">
            <Veld
              label="Welke categorieën gebruikt u, in uw eigen woorden?"
              hint="Bijvoorbeeld: ontharing, huidverbetering, injectables. De AI toont eerst een categorie en pas daarna de behandelingen."
              waarde={data.categorieen}
              zet={(v) => zet("categorieen", v)}
              regels={2}
            />
            <div className="grid gap-4">
              {data.behandelingen.map((b, i) => (
                <Blok
                  key={i}
                  titel={`Behandeling ${i + 1}`}
                  kanWeg={data.behandelingen.length > 1}
                  weg={() => zet("behandelingen", data.behandelingen.filter((_, j) => j !== i))}
                >
                  {([
                    ["Naam", "naam"],
                    ["Categorie", "categorie"],
                    ["Korte uitleg (2 zinnen)", "uitleg"],
                    ["Duur", "duur"],
                    ["Prijs of vanaf-prijs", "prijs"],
                    ["Eerst een consult nodig?", "consultNodig"],
                    ["Mag de AI deze voorstellen?", "magVoorstellen"],
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
              <Toevoegen tekst="Behandeling toevoegen" klik={() => zet("behandelingen", [...data.behandelingen, leegBehandeling()])} />
            </div>
            <Veld
              label="Zijn er behandelingen die de AI beter niet noemt?"
              waarde={data.behandelingenNiet}
              zet={(v) => zet("behandelingenNiet", v)}
              regels={2}
            />
            <div className="grid gap-4">
              {data.consulten.map((c, i) => (
                <Blok
                  key={i}
                  titel={`Consult ${i + 1}`}
                  kanWeg={data.consulten.length > 1}
                  weg={() => zet("consulten", data.consulten.filter((_, j) => j !== i))}
                >
                  {([
                    ["Naam van het consult", "naam"],
                    ["Waarvoor is het bedoeld?", "waarvoor"],
                    ["Gratis of prijs", "prijs"],
                    ["Duur", "duur"],
                    ["Op welke vestigingen", "vestigingen"],
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
              <Toevoegen tekst="Consult toevoegen" klik={() => zet("consulten", [...data.consulten, leegConsult()])} />
            </div>
            <Veld
              label="Wat gebeurt er meteen na een consult?"
              hint="Bijvoorbeeld een offerte, een behandelplan of meteen een afspraak."
              waarde={data.naConsult}
              zet={(v) => zet("naConsult", v)}
              regels={2}
            />
          </div>
        )}

        {stap === 3 && (
          <div className="grid gap-5">
            <Vinkjes
              label="Welke klantgegevens zijn verplicht om een afspraak te maken?"
              opties={["Voornaam", "Achternaam", "Telefoonnummer", "E-mailadres", "Behandeling", "Datum en tijd", "Voorkeursmedewerker"]}
              waarden={data.afspraken.verplichteGegevens}
              zet={(v) => setData((d) => ({ ...d, afspraken: { ...d.afspraken, verplichteGegevens: v } }))}
            />
            <Veld label="Welk agenda- of afsprakensysteem gebruikt u?" waarde={data.afspraken.systeem} zet={(v) => zetVeld("afspraken", "systeem", v)} />
            <Keuze
              label="Mag de AI de vrije momenten uit uw agenda tonen?"
              hint="Dit bepaalt of de AI kan zeggen dat een dag ruim of beperkt beschikbaar is, of alleen kan doorverwijzen."
              opties={["Beschikbaarheid tonen én boeken", "Alleen beschikbaarheid tonen", "Alleen doorverwijzen"]}
              waarde={data.afspraken.agendaToegang}
              zet={(v) => zetVeld("afspraken", "agendaToegang", v)}
            />
            <Veld label="Hoe lang vóór een afspraak moet een klant minimaal boeken?" waarde={data.afspraken.minimumVooraf} zet={(v) => zetVeld("afspraken", "minimumVooraf", v)} />
            <Veld label="Is er een buffer nodig tussen twee afspraken?" waarde={data.afspraken.buffer} zet={(v) => zetVeld("afspraken", "buffer", v)} />
            <Keuze
              label="Mogen klanten dezelfde dag nog boeken?"
              opties={["Ja", "Nee", "Onder voorwaarden"]}
              waarde={data.afspraken.zelfdeDag}
              zet={(v) => zetVeld("afspraken", "zelfdeDag", v)}
            />
            <Veld label="Voor welke behandelingen is eerst een consult nodig?" waarde={data.afspraken.consultVerplicht} zet={(v) => zetVeld("afspraken", "consultVerplicht", v)} regels={2} />
            <Veld label="Hoe ver vooraf mogen klanten inplannen?" waarde={data.afspraken.hoeVerVooruit} zet={(v) => zetVeld("afspraken", "hoeVerVooruit", v)} />
            <Veld label="Andere boekingsregels of uitzonderingen?" waarde={data.afspraken.andereRegels} zet={(v) => zetVeld("afspraken", "andereRegels", v)} regels={2} />
            <Veld label="Hoe lang vooraf moet een klant annuleren of verplaatsen?" waarde={data.annuleren.termijn} zet={(v) => zetVeld("annuleren", "termijn", v)} />
            <Veld label="Is er een annuleringskost? Vanaf wanneer en hoeveel?" waarde={data.annuleren.kost} zet={(v) => zetVeld("annuleren", "kost", v)} regels={2} />
            <Veld label="Wat gebeurt er bij een no-show?" waarde={data.annuleren.noShow} zet={(v) => zetVeld("annuleren", "noShow", v)} regels={2} />
            <Veld label="Werkt u met een voorschot?" waarde={data.annuleren.voorschot} zet={(v) => zetVeld("annuleren", "voorschot", v)} />
            <Veld label="Wanneer moet een medewerker tussenkomen bij annuleren of verplaatsen?" waarde={data.annuleren.medewerker} zet={(v) => zetVeld("annuleren", "medewerker", v)} regels={2} />
          </div>
        )}

        {stap === 4 && (
          <div className="grid gap-5">
            <Vinkjes
              label="Wat mag de AI zelfstandig doen?"
              opties={["Algemene vragen beantwoorden", "Prijzen communiceren", "Afspraken maken", "Afspraken verplaatsen", "Klantgegevens verzamelen", "Behandelingen uitleggen", "Promoties communiceren", "Een consult voorstellen"]}
              waarden={data.grenzen.magZelfstandig}
              zet={(v) => setData((d) => ({ ...d, grenzen: { ...d.grenzen, magZelfstandig: v } }))}
            />
            <Veld label="Wat mag de AI absoluut nooit zelfstandig doen of beantwoorden?" waarde={data.grenzen.nooit} zet={(v) => setData((d) => ({ ...d, grenzen: { ...d.grenzen, nooit: v } }))} regels={2} />
            <Vinkjes
              label="Wanneer moet de AI het gesprek altijd overdragen aan een medewerker?"
              opties={["Klant vraagt om een medewerker", "Klacht of ontevreden klant", "Medische of specialistische vraag", "Terugbetaling", "Betalingsprobleem", "Uitzondering op de regels", "Onvoldoende informatie", "Probleem met een afspraak", "Technische storing"]}
              waarden={data.handoff.situaties}
              zet={(v) => setData((d) => ({ ...d, handoff: { ...d.handoff, situaties: v } }))}
            />
            <Keuze
              label="Hoe wilt u een overdracht ontvangen?"
              opties={["E-mail", "WhatsApp", "CRM-melding"]}
              waarde={data.handoff.ontvangst}
              zet={(v) => setData((d) => ({ ...d, handoff: { ...d.handoff, ontvangst: v } }))}
            />
            <Veld label="Op welk adres of nummer?" waarde={data.handoff.ontvangstAdres} zet={(v) => setData((d) => ({ ...d, handoff: { ...d.handoff, ontvangstAdres: v } }))} />
            <Vinkjes
              label="Mag de AI deze zaken voorstellen?"
              opties={["Een afspraak", "Een consult", "Een andere passende behandeling", "Pakketten", "Actieve promoties"]}
              waarden={data.commercieel.magVoorstellen}
              zet={(v) => setData((d) => ({ ...d, commercieel: { ...d.commercieel, magVoorstellen: v } }))}
            />
            <Veld label="Wat mag de AI commercieel nooit voorstellen?" waarde={data.commercieel.nooit} zet={(v) => setData((d) => ({ ...d, commercieel: { ...d.commercieel, nooit: v } }))} regels={2} />
          </div>
        )}

        {stap === 5 && (
          <div className="grid gap-5">
            <Keuze
              label="Hoe communiceert u vandaag met klanten?"
              opties={["Zeer informeel", "Informeel maar professioneel", "Warm en persoonlijk", "Neutraal en professioneel", "Formeel"]}
              waarde={data.toon.stijl}
              zet={(v) => zetVeld("toon", "stijl", v)}
            />
            <Keuze
              label="Welke aanspreekvorm gebruikt de AI?"
              hint="De AI houdt één vorm aan, want de teksten liggen vooraf vast."
              opties={["Je", "U"]}
              waarde={data.toon.aanspreekvorm}
              zet={(v) => zetVeld("toon", "aanspreekvorm", v)}
            />
            <Veld label="Woorden, uitdrukkingen of emoji die de AI wel of niet mag gebruiken" waarde={data.toon.woorden} zet={(v) => zetVeld("toon", "woorden", v)} regels={2} />
            <div className="grid gap-3">
              <p className="text-sm font-medium text-foreground">Antwoorden op veelgestelde vragen</p>
              <p className="text-xs text-muted-foreground">Vul in wat uw team vandaag zou antwoorden. Geldt het maar voor één behandeling, schrijf die er dan bij.</p>
              {([
                ["Voorbereiding", "voorbereiding"],
                ["Na de behandeling", "nazorg"],
                ["Pijn of ongemak", "pijn"],
                ["Resultaat en aantal sessies", "resultaat"],
                ["Duur van een behandeling", "duur"],
                ["Prijsindicatie", "prijsindicatie"],
                ["Waar de AI hier nooit iets over mag zeggen", "nooit"],
              ] as const).map(([label, veld]) => (
                <Veld key={veld} label={label} waarde={data.faq[veld] as string} zet={(v) => zetVeld("faq", veld, v)} regels={2} />
              ))}
            </div>
            <div className="grid gap-3">
              <p className="text-sm font-medium text-foreground">Vragen die uw team wekelijks krijgt</p>
              {data.faq.vragen.map((v, i) => (
                <Blok
                  key={i}
                  titel={`Vraag ${i + 1}`}
                  kanWeg={data.faq.vragen.length > 1}
                  weg={() => setData((d) => ({ ...d, faq: { ...d.faq, vragen: d.faq.vragen.filter((_, j) => j !== i) } }))}
                >
                  <Veld label="Vraag" waarde={v.vraag} zet={(nieuw) => setData((d) => ({ ...d, faq: { ...d.faq, vragen: d.faq.vragen.map((x, j) => (i === j ? { ...x, vraag: nieuw } : x)) } }))} />
                  <Veld label="Antwoord van uw team" waarde={v.antwoord} regels={2} zet={(nieuw) => setData((d) => ({ ...d, faq: { ...d.faq, vragen: d.faq.vragen.map((x, j) => (i === j ? { ...x, antwoord: nieuw } : x)) } }))} />
                </Blok>
              ))}
              <Toevoegen tekst="Vraag toevoegen" klik={() => setData((d) => ({ ...d, faq: { ...d.faq, vragen: [...d.faq.vragen, leegVraag()] } }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["Agenda of boeking", "agenda"],
                ["CRM of klantenbestand", "crm"],
                ["Websiteplatform", "website"],
                ["E-mail", "email"],
                ["Betalingen", "betalingen"],
                ["Andere systemen", "andere"],
              ] as const).map(([label, veld]) => (
                <Veld key={veld} label={label} waarde={data.systemen[veld]} zet={(v) => zetVeld("systemen", veld, v)} />
              ))}
            </div>
            <div className="grid gap-3">
              <p className="text-sm font-medium text-foreground">Lopende promoties</p>
              <p className="text-xs text-muted-foreground">Alleen invullen als er een actie loopt. Zo vermeldt de AI nooit een verlopen aanbieding.</p>
              {data.promoties.map((p, i) => (
                <Blok key={i} titel={`Promotie ${i + 1}`} kanWeg weg={() => zet("promoties", data.promoties.filter((_, j) => j !== i))}>
                  {([
                    ["Naam", "naam"],
                    ["Geldig van", "van"],
                    ["Geldig tot", "tot"],
                    ["Behandeling", "behandeling"],
                    ["Aanbod", "aanbod"],
                    ["Voorwaarden", "voorwaarden"],
                  ] as const).map(([label, veld]) => (
                    <Veld key={veld} label={label} waarde={p[veld]} zet={(nieuw) => zet("promoties", data.promoties.map((x, j) => (i === j ? { ...x, [veld]: nieuw } : x)))} />
                  ))}
                </Blok>
              ))}
              <Toevoegen tekst="Promotie toevoegen" klik={() => zet("promoties", [...data.promoties, leegPromotie()])} />
            </div>
          </div>
        )}

        {stap === 6 && (
          <div className="grid gap-5">
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">Dit sturen we mee. Klopt er iets niet, ga dan terug naar die stap.</p>
              <div className="grid gap-2 rounded-2xl border border-border bg-background/60 p-4 text-sm">
                <p><span className="text-muted-foreground">Bedrijf:</span> {data.bedrijf.naam || "nog niet ingevuld"}</p>
                <p><span className="text-muted-foreground">Vestigingen:</span> {data.vestigingen.filter((v) => v.naam).length}</p>
                <p><span className="text-muted-foreground">Behandelingen:</span> {data.behandelingen.filter((b) => b.naam).length}</p>
                <p><span className="text-muted-foreground">Consulten:</span> {data.consulten.filter((c) => c.naam).length}</p>
                <p><span className="text-muted-foreground">Veelgestelde vragen:</span> {data.faq.vragen.filter((v) => v.vraag).length}</p>
                <p><span className="text-muted-foreground">Aanspreekvorm:</span> {data.toon.aanspreekvorm || "nog niet gekozen"}</p>
              </div>
            </div>
            <Veld label="Iets dat we nog moeten weten?" waarde={data.klanten.extraInfo} zet={(v) => zetVeld("klanten", "extraInfo", v)} regels={3} />
            {fout && <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{fout}</p>}
            <button
              type="button"
              onClick={versturen}
              disabled={verzenden}
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {verzenden ? "Versturen…" : "Versturen"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStap((s) => Math.max(0, s - 1))}
          disabled={stap === 0}
          className="rounded-full border border-border px-5 py-2.5 text-sm text-foreground transition-colors hover:border-primary disabled:opacity-40"
        >
          Vorige
        </button>
        <span className="text-xs text-muted-foreground">{bewaard ? `Automatisch bewaard om ${bewaard}` : "Uw antwoorden blijven op dit apparaat bewaard"}</span>
        <button
          type="button"
          onClick={() => setStap((s) => Math.min(STAPPEN.length - 1, s + 1))}
          disabled={laatste}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          Volgende
        </button>
      </div>
    </main>
  );
}
