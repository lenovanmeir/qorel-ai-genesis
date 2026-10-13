// Leno's dashboard reads its lists here, straight from the database: no n8n run per page load.
// Same lists and shape as n8n workflow "Dashboard vandaag (Leads)" (GET qa-dashboard-vandaag), so the page can switch over 1:1.
// Actions (verstuurd, getikt, ...) still go to n8n while the Google Sheet is the source of truth.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BEHEERCODE = Deno.env.get("BEHEERCODE") ?? "";

const TOEGESTAAN = new Set([
  "https://qoreaesthetics.com",
  "https://www.qoreaesthetics.com",
  "http://localhost:8080",
  "http://aesthetics.localhost:8080",
]);

type Lead = {
  sheet_rij: number;
  kliniek: string;
  stad: string | null;
  instagram: string | null;
  email: string | null;
  contact_via: string | null;
  status: string;
  opvolgen_op: string | null;
  bericht: string | null;
  volgende_stap: string | null;
  versie: string | null;
  opwarmen: string | null;
  reactie_opwarmen: string | null;
  opvolging_1: string | null;
  opvolging_2: string | null;
  vraagknop: string | null;
};

function cors(origin: string | null): Record<string, string> {
  const o = origin && TOEGESTAAN.has(origin) ? origin : "https://qoreaesthetics.com";
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Headers": "x-beheercode, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    Vary: "Origin",
  };
}

// Constant-time compare, so the code cannot be guessed character by character from response times.
function gelijk(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let verschil = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) verschil |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return verschil === 0;
}

async function lees(pad: string): Promise<unknown[]> {
  const antwoord = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!antwoord.ok) throw new Error(`${pad.split("?")[0]}: ${antwoord.status}`);
  return (await antwoord.json()) as unknown[];
}

const fmt = (d: Date) =>
  d.toLocaleDateString("nl-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "2-digit", year: "2-digit" });
// "dd/mm/yy" (Brussels) -> UTC midnight, the same day key the n8n workflow used.
const dagWaarde = (s: string) => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  return m ? Date.UTC(2000 + Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
};
// Database date "yyyy-mm-dd" -> "dd/mm/yy", the format the dashboard shows and sorts on.
const toonDatum = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "");
const isoWaarde = (iso: string | null) => (iso ? Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) : null);

function bouwLijst(leads: Lead[]) {
  const vandaag = fmt(new Date());
  const morgen = fmt(new Date(Date.now() + 864e5));
  const vt = dagWaarde(vandaag)!;
  const mt = dagWaarde(morgen)!;
  const getiktIso = (s: string) => (s.match(/\[(\d{4}-[^\]]+)\]/) ?? [])[1] ?? null;
  const leeg = () => ({ sturen: [] as unknown[], opwarmen: [] as unknown[], opvolgen: [] as unknown[] });
  const nu = leeg();
  const straks = leeg();
  const nakijken: unknown[] = [];
  const vraagknopTikken: unknown[] = [];
  const vraagknopWachten: unknown[] = [];

  for (const l of leads) {
    const status = l.status;
    const datum = isoWaarde(l.opvolgen_op);
    const aa = l.vraagknop ?? "";
    const opwarmen = l.opwarmen ?? "";
    const basis = {
      rij: l.sheet_rij,
      naam: l.kliniek,
      stad: l.stad ?? "",
      instagram: l.instagram ?? "",
      email: l.email ?? "",
      kanaal: l.contact_via ?? "",
      status,
      datum: toonDatum(l.opvolgen_op),
      volgendeStap: l.volgende_stap ?? "",
      versie: l.versie ?? "",
      vraagknop: aa.replace(/\s*\[[^\]]+\]/, ""),
    };
    const klaar = ["Opwarmen", "Klaar om te sturen"].includes(status) && !!l.bericht;
    if (klaar && datum !== null && datum <= vt) nu.sturen.push({ ...basis, bericht: l.bericht });
    if (klaar && datum === mt) straks.sturen.push({ ...basis, bericht: l.bericht });
    if (status === "Opwarmen" && opwarmen.startsWith(vandaag.slice(0, 5)))
      nu.opwarmen.push({ ...basis, uitleg: opwarmen, reactie: l.reactie_opwarmen ?? "" });
    if (status === "Opwarmen" && opwarmen.startsWith(morgen.slice(0, 5)))
      straks.opwarmen.push({ ...basis, uitleg: opwarmen, reactie: l.reactie_opwarmen ?? "" });
    const eerste = status === "DM verstuurd";
    const opvolg = eerste || status === "Opgevolgd 1";
    const opvolgItem = () => ({ ...basis, bericht: (eerste ? l.opvolging_1 : l.opvolging_2) ?? "", stap: eerste ? 1 : 2 });
    if (opvolg && datum !== null && datum <= vt) nu.opvolgen.push(opvolgItem());
    if (opvolg && datum === mt) straks.opvolgen.push(opvolgItem());
    if (status === "Nakijken") nakijken.push(basis);
    // Question-button test: Instagram clinics that get a DM today or tomorrow and were not checked yet,
    // or that have buttons Leno has not tapped yet.
    if (klaar && l.contact_via === "Instagram-DM" && datum !== null && datum <= mt && (!aa.trim() || aa.startsWith("Heeft vraagknoppen")))
      vraagknopTikken.push(basis);
    const iso = getiktIso(aa);
    if (iso && !aa.includes("->") && klaar)
      vraagknopWachten.push({ ...basis, minuten: Math.round((Date.now() - Date.parse(iso)) / 60000) });
  }
  return {
    vandaag,
    sturen: nu.sturen,
    opwarmen: nu.opwarmen,
    opvolgen: nu.opvolgen,
    nakijken,
    vraagknopTikken,
    vraagknopWachten,
    morgen: { datum: morgen, ...straks },
  };
}

// deno-lint-ignore no-explicit-any
function demoVorm(d: any) {
  return {
    id: d.id, kliniek: d.kliniek, instagram: d.instagram || "", website: d.website || "", taal: d.taal || "nl",
    status: d.status, fout: d.fout || "", code: d.code || "", token: d.token, nakijk: d.nakijk_token,
    aangemaakt: d.created_at, verstuurd_op: d.verstuurd_op, verloopt_op: d.verloopt_op,
    gebruikt: d.berichten_gebruikt || 0, max: d.max_berichten || 0, eerste_gebruik: d.eerste_gebruik,
    laatste_gebruik: d.laatste_gebruik, meer_tijd: d.verlenging_gevraagd_op, dm_tekst: d.dm_tekst || "",
    dm_verstuurd_op: d.dm_verstuurd_op || null, controle: d.controle || null,
  };
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
  if (req.method !== "GET") return json({ fout: "Alleen lezen" }, 405);
  if (!BEHEERCODE || !gelijk(req.headers.get("x-beheercode") ?? "", BEHEERCODE))
    return json({ fout: "Beheercode klopt niet" }, 403);

  try {
    const kolommen =
      "sheet_rij,kliniek,stad,instagram,email,contact_via,status,opvolgen_op,bericht,volgende_stap,versie,opwarmen,reactie_opwarmen,opvolging_1,opvolging_2,vraagknop";
    const [leads, demos] = await Promise.all([
      lees(`leads?select=${kolommen}&order=sheet_rij.asc`),
      // Demos are extra: if this read fails the lists still load, as in the n8n version.
      lees("demo_aanvragen?select=*&status=neq.nieuw&order=created_at.desc&limit=60").catch(() => []),
    ]);
    return json({ ...bouwLijst(leads as Lead[]), demos: (demos as unknown[]).map(demoVorm), bron: "database" });
  } catch (e) {
    console.error(e);
    return json({ fout: "De lijst kon niet geladen worden" }, 500);
  }
});
