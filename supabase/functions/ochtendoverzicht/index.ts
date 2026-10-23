// Process plan (24/10, approved by Leno + Gemini): Telegram carries one morning overview, plus realtime messages only
// for what is "hot" (a clinic answers, uses its demo, books a call or pays). Everything else that used to ping Leno
// during the night (demos built in advance, auto-released demos, the n8n 05:10 overview) is collected here.
//
// The day lists come from the dashboard function itself, so the counts are exactly what Leno sees on /dashboard.
// Called by pg_cron at 23:30 UTC (07:30 Bali). No AI, no tokens. {"proef": true} with the beheercode returns the text
// without sending: it holds review links, so it is never answered without the code.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BEHEERCODE = (Deno.env.get("BEHEERCODE") ?? "").trim();
const TELEGRAM_TOKEN = (Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "").trim();
const CHAT_ID = (Deno.env.get("TELEGRAM_CHAT_ID") ?? "423937318").trim();
const DASHBOARD = "https://qoreaesthetics.com/dashboard";

type Item = { id: string; naam: string; stap?: number };
type Dag = {
  sturen: Item[];
  opwarmen: Item[];
  opvolgen: Item[];
  nakijken: Item[];
  vraagknopTikken: Item[];
  heet: { kliniek: string; fase: string }[];
};
type Demo = {
  kliniek: string;
  status: string;
  bron: string | null;
  code: string | null;
  nakijk_token: string | null;
  hoge_kwaliteit: boolean | null;
  verstuurd_op: string | null;
  created_at: string;
  verlenging_gevraagd_op: string | null;
};

async function db<T>(pad: string): Promise<T> {
  const antwoord = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!antwoord.ok) throw new Error(`${pad.split("?")[0]}: ${antwoord.status} ${await antwoord.text()}`);
  return (await antwoord.json()) as T;
}

// Only the number of rows: PostgREST answers it in Content-Range, without sending the rows.
async function tel(pad: string): Promise<number> {
  const antwoord = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    method: "HEAD",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: "count=exact" },
  });
  return Number((antwoord.headers.get("content-range") ?? "").split("/")[1]) || 0;
}

const html = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const namen = (lijst: { naam?: string; kliniek?: string }[], max = 6) =>
  lijst.slice(0, max).map((x) => html(x.naam ?? x.kliniek)).join(", ") + (lijst.length > max ? ` +${lijst.length - max}` : "");

const FASE: Record<string, string> = {
  REPLIED: "antwoordde",
  DEMO_USED: "gebruikte de demo",
  MEETING_BOOKED: "boekte een gesprek",
  MEETING_HELD: "had een gesprek",
};

async function overzicht(): Promise<string> {
  const sinds = new Date(Date.now() - 24 * 3600e3).toISOString();
  const [dagAntwoord, nieuw, instelling, demos, antwoorden, kost, fouten, onboardFout] = await Promise.all([
    fetch(`${SUPABASE_URL}/functions/v1/dashboard`, { headers: { "x-beheercode": BEHEERCODE } }),
    tel(`leads?select=id&aangemaakt_op=gte.${sinds}`),
    db<{ zoeken: boolean; planner_aan: boolean }[]>("zoeker_instellingen?select=zoeken,planner_aan&limit=1"),
    db<Demo[]>(
      "demo_aanvragen?select=kliniek,status,bron,code,nakijk_token,hoge_kwaliteit,verstuurd_op,created_at,verlenging_gevraagd_op" +
        `&or=(created_at.gte.${sinds},verstuurd_op.gte.${sinds},status.eq.te_controleren,verlenging_gevraagd_op.gte.${sinds})` +
        "&order=created_at.asc&limit=100",
    ),
    tel(`lead_gebeurtenissen?select=id&soort=eq.antwoord&op=gte.${sinds}`),
    db<{ kost_usd: number }[]>(`ai_verbruik?select=kost_usd&op=gte.${sinds}`),
    tel(`kanaal_fouten?select=id&aangemaakt_op=gte.${sinds}`),
    db<{ kliniek_naam: string; fout: string }[]>("onboardingen?select=kliniek_naam,fout&fout=not.is.null&limit=5"),
  ]);
  if (!dagAntwoord.ok) throw new Error(`dashboard ${dagAntwoord.status}`);
  const dag = (await dagAntwoord.json()) as Dag;

  const gebouwd = demos.filter((d) => d.created_at >= sinds && !["mislukt", "geen_website"].includes(d.status));
  const mislukt = demos.filter((d) => d.created_at >= sinds && d.status === "mislukt");
  const vrijgegeven = demos.filter((d) => d.verstuurd_op && d.verstuurd_op >= sinds);
  const nakijken = demos.filter((d) => d.status === "te_controleren");
  const verlengen = demos.filter((d) => d.verlenging_gevraagd_op && d.verlenging_gevraagd_op >= sinds);
  const dollar = kost.reduce((s, r) => s + Number(r.kost_usd || 0), 0);
  const zoeker = instelling[0];

  const regels: string[] = [`☀️ <b>Ochtendoverzicht</b>`];

  if (dag.heet.length) {
    regels.push("", `🔥 <b>Heet (${dag.heet.length})</b>: ${dag.heet.slice(0, 6).map((h) => `${html(h.kliniek)} ${FASE[h.fase] ?? h.fase}`).join(" · ")}`);
  }

  regels.push(
    "",
    `<b>Vandaag op het dashboard</b>`,
    `📨 Versturen: ${dag.sturen.length}`,
    `🔁 Opvolgen: ${dag.opvolgen.length}${dag.opvolgen.length ? ` (${namen(dag.opvolgen)})` : ""}`,
    `❤️ Opwarmen: ${dag.opwarmen.length}`,
    `👆 Vraagknop tikken: ${dag.vraagknopTikken.length}`,
  );
  if (dag.nakijken.length) regels.push(`👀 Leads nakijken: ${dag.nakijken.length}`);

  regels.push(
    "",
    `<b>Laatste 24 uur</b>`,
    `➕ Nieuwe leads: ${nieuw} · zoeker ${zoeker?.zoeken ? "aan" : "uit (voorraad vol)"}`,
    `🧪 Demo's gebouwd: ${gebouwd.length}${mislukt.length ? ` · ❌ mislukt: ${mislukt.length}` : ""}`,
    `✅ Demo's vrijgegeven: ${vrijgegeven.length}${vrijgegeven.length ? ` (${namen(vrijgegeven)})` : ""}`,
    `💬 Berichten van klinieken: ${antwoorden}`,
    `🤖 AI-kost: $${dollar.toFixed(2)}`,
  );

  if (nakijken.length) {
    regels.push("", `<b>Demo's wachten op jouw controle (${nakijken.length})</b>`);
    for (const d of nakijken.slice(0, 8)) {
      const link = d.code && d.nakijk_token ? `https://qoreaesthetics.com/intake/${d.code}?nakijk=${d.nakijk_token}` : DASHBOARD;
      regels.push(`• <a href="${link}">${html(d.kliniek)}</a>${d.hoge_kwaliteit ? " ⭐" : ""}`);
    }
    if (nakijken.length > 8) regels.push(`… en ${nakijken.length - 8} meer op het dashboard`);
  }
  if (verlengen.length) regels.push("", `⏳ Vraagt meer demotijd: ${namen(verlengen)}`);

  const problemen: string[] = [];
  if (fouten) problemen.push(`${fouten} mislukte Meta-call(s)`);
  if (onboardFout.length) problemen.push(`onboarding: ${namen(onboardFout)}`);
  if (zoeker && !zoeker.planner_aan) problemen.push("dagplanner staat uit");
  if (problemen.length) regels.push("", `⚠️ <b>Let op</b>: ${problemen.join(" · ")}`);

  regels.push("", `<a href="${DASHBOARD}">Open het dashboard</a>`);
  return regels.join("\n").slice(0, 4000);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Alleen POST", { status: 405 });
  if (!BEHEERCODE) return Response.json({ fout: "BEHEERCODE ontbreekt" }, { status: 500 });
  const body = await req.json().catch(() => ({}));
  try {
    const tekst = await overzicht();
    if (body?.proef) {
      if ((req.headers.get("x-beheercode") ?? "") !== BEHEERCODE) return Response.json({ fout: "Beheercode klopt niet" }, { status: 403 });
      return Response.json({ tekst });
    }
    if (!TELEGRAM_TOKEN) return Response.json({ fout: "TELEGRAM_BOT_TOKEN ontbreekt" }, { status: 500 });
    const antwoord = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: tekst, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!antwoord.ok) throw new Error(`Telegram ${antwoord.status} ${await antwoord.text()}`);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("ochtendoverzicht", (e as Error).message);
    return Response.json({ fout: (e as Error).message }, { status: 500 });
  }
});
