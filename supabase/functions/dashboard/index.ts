// Leno's dashboard reads and writes its leads here, straight from the database: no n8n run per page load or click.
// Since 18/10 the database is the only source of the leads; the Google Sheet is a nightly read-only copy.
// GET = the daily lists (same rules as the old n8n workflow "Dashboard vandaag (Leads)"), POST = the buttons.

import { ActieFout, vertaalActies, type Actie, type LeadNu } from "./acties.ts";

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
  id: string;
  sheet_rij: number | null;
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
  fase: string;
};

function cors(origin: string | null): Record<string, string> {
  const o = origin && TOEGESTAAN.has(origin) ? origin : "https://qoreaesthetics.com";
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Headers": "x-beheercode, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

// Supabase returns at most 1000 rows per request, so lists that can grow are read in blocks of 1000.
async function leesAlles(pad: string): Promise<unknown[]> {
  const uit: unknown[] = [];
  for (let van = 0; ; van += 1000) {
    const antwoord = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Range-Unit": "items", Range: `${van}-${van + 999}` },
    });
    if (!antwoord.ok) throw new Error(`${pad.split("?")[0]}: ${antwoord.status}`);
    const blok = (await antwoord.json()) as unknown[];
    uit.push(...blok);
    if (blok.length < 1000) return uit;
  }
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

  // Leno's daily flow (13/10): day 1 warm up + look for question buttons, day 2 tap one, wait 2,5 h, then send.
  // The button step (column AA) is still open while AA is empty, says "Heeft vraagknoppen", or was tapped
  // without an outcome ("->"). While it is open an Instagram DM waits in the button blocks, not in Versturen.
  // "Geen vraagknoppen", "Privéaccount", "Niet meer testen" or any "->" outcome closes the step.
  const knopStapOpen = (aa: string) => !aa.trim() || aa.startsWith("Heeft vraagknoppen") || (aa.includes("Getikt") && !aa.includes("->"));
  // Clinics with a demo or an answer are handled in the Demo's tab / by Leno, never in the daily blocks.
  const BUITEN_DAGLIJST = new Set(["Demo klaar", "Demo verstuurd", "Geantwoord"]);
  // Stages the sheet does not know about (demo used, call booked or held, client, later): the sheet status may
  // still say "DM verstuurd", but these clinics must never get a cold follow-up.
  const FASE_BUITEN_DAGLIJST = new Set(["DEMO_USED", "MEETING_BOOKED", "MEETING_HELD", "WON", "NURTURE"]);

  for (const l of leads) {
    const status = l.status;
    if (BUITEN_DAGLIJST.has(status) || FASE_BUITEN_DAGLIJST.has(l.fase)) continue;
    const datum = isoWaarde(l.opvolgen_op);
    const aa = l.vraagknop ?? "";
    const opwarmen = l.opwarmen ?? "";
    const basis = {
      id: l.id,
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
    const instagram = l.contact_via === "Instagram-DM";
    // Mail clinics have no button step; Instagram DMs only once the button step is done.
    const magSturen = klaar && (!instagram || !knopStapOpen(aa));
    if (magSturen && datum !== null && datum <= vt) nu.sturen.push({ ...basis, bericht: l.bericht });
    if (magSturen && datum === mt) straks.sturen.push({ ...basis, bericht: l.bericht });
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
    if (klaar && instagram && datum !== null && datum <= mt && (!aa.trim() || aa.startsWith("Heeft vraagknoppen")))
      vraagknopTikken.push(basis);
    const iso = getiktIso(aa);
    if (iso && !aa.includes("->") && klaar)
      vraagknopWachten.push({ ...basis, minuten: Math.round((Date.now() - Date.parse(iso)) / 60000) });
  }

  // One clinic in at most one block per day: the first block in this order keeps it.
  const gezien = new Set<string>();
  const uniek = <T extends { id: string }>(lijst: T[]) =>
    lijst.filter((t) => (gezien.has(t.id) ? false : (gezien.add(t.id), true)));
  const wachten = uniek(vraagknopWachten as { id: string }[]);
  const tikken = uniek(vraagknopTikken as { id: string }[]);
  const sturen = uniek(nu.sturen as { id: string }[]);
  const opvolgen = uniek(nu.opvolgen as { id: string }[]);
  const opwarmenVandaag = uniek(nu.opwarmen as { id: string }[]);
  const nakijkenUniek = uniek(nakijken as { id: string }[]);
  return {
    vandaag,
    sturen,
    opwarmen: opwarmenVandaag,
    opvolgen,
    nakijken: nakijkenUniek,
    vraagknopTikken: tikken,
    vraagknopWachten: wachten,
    morgen: { datum: morgen, ...straks },
  };
}

type VerbruikRij = {
  onderdeel: string;
  kost_usd: string | number;
  clinics: { name: string; is_klant: boolean } | null;
};

// AI cost this month, split the way Leno reads his month: his own costs per part (finding leads, writing texts,
// building and testing demos, demo chats of prospects) and the costs of each paying client per part.
function verbruikDezeMaand(rijen: VerbruikRij[], vanaf: Date) {
  const rond = (n: number) => Math.round(n * 10000) / 10000;
  const optellen = (lijst: Record<string, { oproepen: number; usd: number }>, sleutel: string, usd: number) => {
    const o = (lijst[sleutel] ??= { oproepen: 0, usd: 0 });
    o.oproepen++;
    o.usd += usd;
  };
  const eigen: Record<string, { oproepen: number; usd: number }> = {};
  const klanten: Record<string, { usd: number; oproepen: number; onderdelen: Record<string, { oproepen: number; usd: number }> }> = {};
  let totaal = 0;
  let eigenTotaal = 0;
  for (const r of rijen) {
    const usd = Number(r.kost_usd) || 0;
    totaal += usd;
    if (r.clinics?.is_klant) {
      const k = (klanten[r.clinics.name] ??= { usd: 0, oproepen: 0, onderdelen: {} });
      k.usd += usd;
      k.oproepen++;
      optellen(k.onderdelen, r.onderdeel, usd);
    } else {
      eigenTotaal += usd;
      optellen(eigen, r.onderdeel, usd);
    }
  }
  const lijst = (o: Record<string, { oproepen: number; usd: number }>) =>
    Object.entries(o).map(([onderdeel, v]) => ({ onderdeel, oproepen: v.oproepen, usd: rond(v.usd) })).sort((a, b) => b.usd - a.usd);
  return {
    vanaf: vanaf.toISOString().slice(0, 10),
    totaal_usd: rond(totaal),
    eigen_usd: rond(eigenTotaal),
    klanten_usd: rond(totaal - eigenTotaal),
    oproepen: rijen.length,
    eigen: lijst(eigen),
    per_klant: Object.entries(klanten)
      .map(([kliniek, v]) => ({ kliniek, usd: rond(v.usd), oproepen: v.oproepen, onderdelen: lijst(v.onderdelen) }))
      .sort((a, b) => b.usd - a.usd),
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

async function schrijf(pad: string, method: "PATCH" | "POST", body: unknown): Promise<void> {
  const antwoord = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      "x-qore-bron": "dashboard", // shows up as bron on the stage-change events
    },
    body: JSON.stringify(body),
  });
  if (!antwoord.ok) throw new Error(`${pad.split("?")[0]}: ${antwoord.status} ${await antwoord.text()}`);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// POST {acties: [{id, actie, tijd}]}: all marks of one block in one request, one PATCH per lead.
async function voerActiesUit(acties: Actie[]): Promise<number> {
  const ids = [...new Set((Array.isArray(acties) ? acties : []).map((a) => a?.id).filter((id) => typeof id === "string" && UUID.test(id)))];
  const rijen = ids.length
    ? ((await lees(`leads?select=id,contact_via,bericht,vraagknop&id=in.(${ids.join(",")})`)) as LeadNu[])
    : [];
  const patches = vertaalActies(acties, new Map(rijen.map((r) => [r.id, r])));
  for (const [id, patch] of patches) await schrijf(`leads?id=eq.${id}`, "PATCH", patch);
  return acties.length;
}

// POST {demo: {code, actie}}: the "DM verstuurd" button in the Demo's tab. A trigger in the database fixes the
// demo's status label and moves the lead to DEMO_SENT.
async function demoActie(demo: { code?: string; actie?: string }): Promise<void> {
  const code = String(demo?.code ?? "").trim().toLowerCase();
  if (!/^[a-z0-9-]{3,60}$/.test(code) || !["dm_verstuurd", "dm_niet_verstuurd"].includes(String(demo?.actie)))
    throw new ActieFout("Ongeldige demo-actie");
  await schrijf(`demo_aanvragen?code=eq.${code}`, "PATCH", {
    dm_verstuurd_op: demo.actie === "dm_verstuurd" ? new Date().toISOString() : null,
  });
}

// POST {vasteKost: {id?, naam, categorie, bedrag, valuta, per, actief}}: Leno adds or edits a fixed cost.
async function vasteKostBewaren(k: Record<string, unknown>): Promise<void> {
  const naam = String(k?.naam ?? "").trim().slice(0, 120);
  const bedrag = Number(k?.bedrag);
  if (!naam || !Number.isFinite(bedrag) || bedrag < 0 || bedrag > 100000) throw new ActieFout("Ongeldige vaste kost");
  const rij = {
    naam,
    categorie: String(k?.categorie ?? "").trim().slice(0, 60) || null,
    bedrag: Math.round(bedrag * 100) / 100,
    valuta: k?.valuta === "USD" ? "USD" : "EUR",
    per: k?.per === "jaar" ? "jaar" : "maand",
    actief: k?.actief !== false,
  };
  const id = Number(k?.id);
  if (Number.isInteger(id) && id > 0) await schrijf(`vaste_kosten?id=eq.${id}`, "PATCH", rij);
  else await schrijf("vaste_kosten", "POST", rij);
}

// The Leads tab never loads every clinic: it shows the clinics that need Leno (see "heet") and searches on demand.
// Search: name, Instagram or city, at most 20 clinics, compact columns.
async function zoekLeads(term: string): Promise<unknown[]> {
  const t = term.replace(/[^\p{L}\p{N} .@_'&-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (t.length < 2) return [];
  const patroon = encodeURIComponent(`*${t}*`);
  return await lees(
    `leads?select=id,kliniek,stad,instagram,kans,status,fase&or=(kliniek.ilike.${patroon},instagram.ilike.${patroon},stad.ilike.${patroon})&order=kans.desc.nullslast&limit=20`,
  );
}

// One clinic in full, only when Leno opens it: the lead, its last events and its demo.
async function leadDetail(id: string) {
  const [lead] = (await lees(`leads?select=*&id=eq.${id}`)) as Record<string, unknown>[];
  if (!lead) return null;
  const [gebeurtenissen, demos] = await Promise.all([
    lees(`lead_gebeurtenissen?select=soort,kanaal,inhoud,bron,op&lead_id=eq.${id}&order=op.desc&limit=15`).catch(() => []),
    lees(`demo_aanvragen?select=kliniek,status,token,verstuurd_op,dm_verstuurd_op,berichten_gebruikt,max_berichten,verloopt_op&lead_id=eq.${id}&order=created_at.desc&limit=1`).catch(() => []),
  ]);
  return { lead, gebeurtenissen, demo: (demos as unknown[])[0] ?? null };
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
  if (req.method !== "GET" && req.method !== "POST") return json({ fout: "Alleen GET of POST" }, 405);
  if (!BEHEERCODE || !gelijk(req.headers.get("x-beheercode") ?? "", BEHEERCODE))
    return json({ fout: "Beheercode klopt niet" }, 403);

  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.demo) {
        await demoActie(body.demo);
        return json({ ok: true });
      }
      if (body?.vasteKost) {
        await vasteKostBewaren(body.vasteKost);
        return json({ ok: true });
      }
      return json({ ok: true, aantal: await voerActiesUit(body?.acties) });
    } catch (e) {
      if (e instanceof ActieFout) return json({ fout: e.message }, 400);
      console.error(e);
      return json({ fout: "Bewaren lukte niet" }, 500);
    }
  }

  const url = new URL(req.url);
  const zoek = url.searchParams.get("zoek");
  const id = url.searchParams.get("id");
  try {
    if (zoek !== null) return json({ leads: await zoekLeads(zoek) });
    if (id !== null) {
      if (!UUID.test(id)) return json({ fout: "Ongeldige lead" }, 400);
      const detail = await leadDetail(id);
      return detail ? json(detail) : json({ fout: "Lead niet gevonden" }, 404);
    }
  } catch (e) {
    console.error(e);
    return json({ fout: "Zoeken lukte niet" }, 500);
  }

  try {
    // Only the statuses the daily blocks use, and only the columns they show: the list stays small however
    // many leads there are.
    const kolommen =
      "id,sheet_rij,kliniek,stad,instagram,email,contact_via,status,opvolgen_op,bericht,volgende_stap,versie,opwarmen,reactie_opwarmen,opvolging_1,opvolging_2,vraagknop,fase";
    const dagStatussen = encodeURIComponent('("Opwarmen","Klaar om te sturen","DM verstuurd","Opgevolgd 1","Nakijken")');
    const maandStart = new Date();
    maandStart.setUTCDate(1);
    maandStart.setUTCHours(0, 0, 0, 0);
    const [leads, demos, verbruik, funnel, heet, vasteKosten] = await Promise.all([
      // Sheet order first (the old rows), then everything added since 18/10 in the order it came in.
      leesAlles(`leads?select=${kolommen}&status=in.${dagStatussen}&order=sheet_rij.asc.nullslast,aangemaakt_op.asc`),
      // Demos and usage are extra: if one of these reads fails the lists still load.
      lees("demo_aanvragen?select=*&status=neq.nieuw&order=created_at.desc&limit=60").catch(() => []),
      leesAlles(`ai_verbruik?select=onderdeel,kost_usd,clinics(name,is_klant)&op=gte.${maandStart.toISOString()}`).catch(() => []),
      lees("lead_funnel?select=fase,rang,bereikt,nu").catch(() => []),
      // Clinics that need Leno personally now: they answered, used their demo or booked a call.
      lees("leads?select=id,sheet_rij,kliniek,stad,instagram,email,status,fase,fase_sinds&fase=in.(REPLIED,DEMO_USED,MEETING_BOOKED,MEETING_HELD)&order=fase_sinds.desc&limit=50").catch(() => []),
      lees("vaste_kosten?select=id,naam,categorie,bedrag,valuta,per,actief,notitie&order=id.asc").catch(() => []),
    ]);
    return json({
      ...bouwLijst(leads as Lead[]),
      demos: (demos as unknown[]).map(demoVorm),
      verbruik: { ...verbruikDezeMaand(verbruik as VerbruikRij[], maandStart), vaste_kosten: vasteKosten },
      funnel,
      heet,
      bron: "database",
    });
  } catch (e) {
    console.error(e);
    return json({ fout: "De lijst kon niet geladen worden" }, 500);
  }
});
