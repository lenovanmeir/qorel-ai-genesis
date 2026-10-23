// Outreach signals from @qoreaesthetics (process plan P1, 23/10). Meta already tells us when Leno sends a DM (an
// "echo") and when a clinic writes back, so nobody has to read the inbox or press "Verstuurd" / "Geantwoord":
//   - echo whose text is a lead's prepared DM, follow-up or demo message → the same status step as the dashboard
//     button, and the clinic's Instagram id is stored on the lead;
//   - message from a lead → "Geantwoord" + Telegram; while a tapped question button waits, only its answer time;
//   - every 15 minutes a tap without an answer after 2,5 h gets "geen antwoord" + the PS in the DM.
// Messages of leads are handled here and not passed to n8n: the AI receptionist never answers a lead, Leno does.
//
// Matching: Meta only sends Instagram-scoped ids. A cold DM is matched on its text (copied 1:1 from the dashboard,
// so 0 API calls); a reply on the sender's username, which Meta only shares once that person wrote to us.

import { vertaalActies, type ActieNaam, type LeadNu } from "../dashboard/acties.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TELEGRAM_TOKEN = (Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "").trim();
const CHAT_ID = (Deno.env.get("TELEGRAM_CHAT_ID") ?? "423937318").trim();
// The outreach account; messages to other clinics' accounts are their customers and are never touched here.
const OUTREACH_IG = (Deno.env.get("OUTREACH_IG_ID") ?? "17841442680949795").trim();
const DASHBOARD = "https://qoreaesthetics.com/dashboard";
const WACHT_OP_KNOP_MS = 2.5 * 3600 * 1000;
// A "reply" this soon after our own message is an automatic welcome text, not a person.
const AUTOMATISCH_MS = 2 * 60 * 1000;

type Lead = LeadNu & {
  kliniek: string;
  status: string;
  instagram_id: string | null;
  instagram_handle: string | null;
  opvolging_1: string | null;
  opvolging_2: string | null;
};
const VELDEN = "id,kliniek,status,contact_via,bericht,vraagknop,instagram_id,instagram_handle,opvolging_1,opvolging_2";
// Same comparison as the database function lead_zoek_op_dm.
const begin = (s: string | null) => (s ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
const VOOR_DM = new Set(["Nieuw", "Opwarmen", "Klaar om te sturen"]);
const NA_DM = new Set(["DM verstuurd", "Opgevolgd 1", "Opgevolgd 2", "Demo verstuurd"]);

async function db<T>(pad: string, init: RequestInit = {}): Promise<T> {
  const antwoord = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      "x-qore-bron": "instagram", // shows up as bron on the stage-change events
      ...(init.headers ?? {}),
    },
  });
  if (!antwoord.ok) throw new Error(`${pad.split("?")[0]}: ${antwoord.status} ${await antwoord.text()}`);
  const tekst = await antwoord.text();
  return (tekst ? JSON.parse(tekst) : null) as T;
}

const html = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const kort = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const urenTekst = (ms: number) => String(Math.max(0.1, Math.round((ms / 36e5) * 10) / 10)).replace(".", ",");

async function telegram(tekst: string) {
  if (!TELEGRAM_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: tekst, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch((e) => console.error("telegram", (e as Error).message));
}

const eenLead = async (filter: string) => (await db<Lead[]>(`leads?select=${VELDEN}&${filter}&limit=1`))[0] ?? null;

// Username of someone who wrote to @qoreaesthetics, with the channel's own token from Vault.
async function gebruikersnaam(igsid: string): Promise<string | null> {
  const k = (await db<{ id: string }[]>(`clinic_channels?select=id&channel=eq.instagram&account_id=eq.${OUTREACH_IG}&limit=1`))[0];
  if (!k) return null;
  const token = await db<string | null>("rpc/kanaal_token_lezen", { method: "POST", body: JSON.stringify({ p_kanaal_id: k.id }) });
  if (!token) return null;
  const antwoord = await fetch(`https://graph.instagram.com/v23.0/${igsid}?fields=username`, { headers: { Authorization: `Bearer ${token}` } });
  if (!antwoord.ok) {
    console.error(JSON.stringify({ profiel_status: antwoord.status }));
    return null;
  }
  const j = await antwoord.json().catch(() => ({}));
  return typeof j.username === "string" ? j.username.toLowerCase() : null;
}

// Stores the message on the lead's timeline. False when Meta delivered the same message before (nothing to do).
async function opTijdlijn(lead: Lead, soort: string, tekst: string, mid: string, op: Date, data: Record<string, unknown>) {
  const rijen = await db<unknown[]>("lead_gebeurtenissen?on_conflict=extern_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({
      lead_id: lead.id, soort, kanaal: "instagram", inhoud: kort(tekst, 2000), bron: "instagram",
      extern_id: `ig:${mid}`, op: op.toISOString(), data,
    }),
  });
  return rijen.length > 0;
}

async function stap(lead: Lead, actie: ActieNaam, op: Date, extra: Record<string, unknown> = {}) {
  const patch = { ...(vertaalActies([{ id: lead.id, actie, tijd: op.toISOString() }], new Map([[lead.id, lead]]), new Date()).get(lead.id) ?? {}), ...extra };
  if (Object.keys(patch).length) await db(`leads?id=eq.${lead.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
  return patch as Record<string, unknown>;
}

// Leno sent something from @qoreaesthetics. Which prepared text it was decides the step, like the dashboard button.
async function naVerstuurd(lead: Lead, welke: string | null, op: Date) {
  if ((welke === "bericht" || welke === "demo") && VOOR_DM.has(lead.status)) {
    const demo = (await db<{ id: string; verstuurd_op: string | null; dm_verstuurd_op: string | null }[]>(
      `demo_aanvragen?select=id,verstuurd_op,dm_verstuurd_op&lead_id=eq.${lead.id}&status=not.in.(mislukt,geen_website)&order=created_at.desc&limit=1`,
    ))[0];
    const metDemo = !!demo?.verstuurd_op;
    await stap(lead, "verstuurd", op, metDemo ? { status: "Demo verstuurd", volgende_stap: "Demo verstuurd: volg op in de tab Demo's" } : {});
    // Marking the demo's DM as sent also moves the lead to DEMO_SENT (database trigger).
    if (metDemo && !demo.dm_verstuurd_op)
      await db(`demo_aanvragen?id=eq.${demo.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ dm_verstuurd_op: op.toISOString() }) });
  } else if (welke === "opvolging_1" && lead.status === "DM verstuurd") {
    await stap(lead, "opvolging1", op);
  } else if (welke === "opvolging_2" && lead.status === "Opgevolgd 1") {
    await stap(lead, "opvolging2", op);
  }
}

type Demo = { id: string; lead_id: string | null; dm_verstuurd_op: string | null; herinnering_1_op: string | null; herinnering_2_op: string | null };
const DEMO_VELDEN = "id,lead_id,dm_verstuurd_op,herinnering_1_op,herinnering_2_op";

// A demo reminder went out (dashboard "Opvolgen", process plan P3): the next free reminder is marked.
async function herinneringVerstuurd(demo: Demo, op: Date) {
  const kolom = !demo.herinnering_1_op ? "herinnering_1_op" : !demo.herinnering_2_op ? "herinnering_2_op" : null;
  if (kolom) await db(`demo_aanvragen?id=eq.${demo.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ [kolom]: op.toISOString() }) });
}

// A lead wrote to @qoreaesthetics.
async function naAntwoord(lead: Lead, tekst: string, op: Date) {
  const aa = lead.vraagknop ?? "";
  const getikt = (aa.match(/\[(\d{4}-[^\]]+)\]/) ?? [])[1];
  // Answer to the question button Leno tapped: that is the test, not a reply to our outreach.
  if (getikt && !aa.includes("->") && VOOR_DM.has(lead.status)) {
    const na = op.getTime() - Date.parse(getikt);
    const automatisch = na < AUTOMATISCH_MS ? " (automatisch)" : "";
    await db(`leads?id=eq.${lead.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ vraagknop: `${aa} -> antwoord na ${urenTekst(na)}u${automatisch}` }),
    });
    return;
  }
  const laatsteUit = (await db<{ op: string }[]>(
    `lead_gebeurtenissen?select=op&lead_id=eq.${lead.id}&soort=eq.dm_uit&order=op.desc&limit=1`,
  ))[0];
  const automatisch = !!laatsteUit && op.getTime() - Date.parse(laatsteUit.op) < AUTOMATISCH_MS;
  if (!automatisch && (NA_DM.has(lead.status) || VOOR_DM.has(lead.status))) await stap(lead, "geantwoord", op);
  await telegram(
    `${automatisch ? "🤖 Automatisch antwoord" : "💬 <b>Antwoord</b>"} van <b>${html(lead.kliniek)}</b>` +
      (lead.instagram_handle ? ` (@${html(lead.instagram_handle)})` : "") +
      `\n\n${html(kort(tekst || "(geen tekst, bv. foto of hartje)", 600))}` +
      `\n\n${automatisch ? "Status niet veranderd." : "Status: Geantwoord, opvolgingen gestopt. De AI antwoordt niet: jij neemt het over."}` +
      `\nhttps://instagram.com/${html(lead.instagram_handle ?? "")} · ${DASHBOARD}`,
  );
}

type MetaBericht = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean };
};

// True when the event belongs to a lead and was handled here (then it is not passed to n8n).
export async function leadSignaal(entryId: string, ev: MetaBericht): Promise<boolean> {
  const m = ev.message;
  if (entryId !== OUTREACH_IG || !m?.mid) return false;
  const echo = !!m.is_echo;
  const ander = String((echo ? ev.recipient?.id : ev.sender?.id) ?? "");
  if (!/^[0-9]+$/.test(ander)) return false;
  const tekst = String(m.text ?? "");
  const op = new Date(Number(ev.timestamp) || Date.now());

  let lead = await eenLead(`instagram_id=eq.${ander}`);
  let welke: string | null = null;
  if (echo && tekst) {
    const treffers = await db<{ lead_id: string; welke: string }[]>("rpc/lead_zoek_op_dm", { method: "POST", body: JSON.stringify({ p_tekst: tekst }) });
    // Only a text that belongs to exactly one lead counts; a generic text could be anyone.
    if (new Set(treffers.map((t) => t.lead_id)).size === 1 && (!lead || lead.id === treffers[0].lead_id)) {
      lead = lead ?? await eenLead(`id=eq.${treffers[0].lead_id}`);
      welke = treffers[0].welke;
    } else if (lead && begin(tekst).length >= 40) {
      // A follow-up that starts like other leads' follow-ups: the clinic is already known, so compare with its own texts.
      const k = begin(tekst);
      welke = k === begin(lead.bericht) ? "bericht" : k === begin(lead.opvolging_1) ? "opvolging_1" : k === begin(lead.opvolging_2) ? "opvolging_2" : null;
    }
  }
  // A message with a demo link (an edited demo DM or a demo reminder) belongs to the lead of that demo.
  let demo: Demo | null = null;
  const token = echo && !welke ? (tekst.match(/qoreaesthetics\.com\/demo\/([a-f0-9]{16,64})/i) ?? [])[1] : undefined;
  if (token) {
    demo = (await db<Demo[]>(`demo_aanvragen?select=${DEMO_VELDEN}&token=eq.${token.toLowerCase()}&limit=1`))[0] ?? null;
    if (demo?.lead_id && (!lead || lead.id === demo.lead_id)) {
      lead = lead ?? await eenLead(`id=eq.${demo.lead_id}`);
      welke = demo.dm_verstuurd_op ? "herinnering" : "demo";
    } else demo = null;
  }
  if (!echo && !lead) {
    const naam = await gebruikersnaam(ander);
    if (naam) lead = await eenLead(`instagram_handle=eq.${encodeURIComponent(naam)}`);
  }
  if (!lead) return false;

  if (lead.instagram_id !== ander) {
    await db(`leads?id=eq.${lead.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ instagram_id: ander }) })
      .catch((e) => console.error("instagram_id", (e as Error).message));
  }
  const nieuw = await opTijdlijn(lead, echo ? "dm_uit" : "antwoord", tekst, m.mid, op, welke ? { welke } : {});
  if (nieuw) {
    if (echo && welke === "herinnering" && demo) await herinneringVerstuurd(demo, op);
    else if (echo) await naVerstuurd(lead, welke, op);
    else await naAntwoord(lead, tekst, op);
  }
  console.log(JSON.stringify({ lead: lead.id, echo, welke, nieuw }));
  return true;
}

// Every 15 minutes (pg_cron): taps without an answer after 2,5 h get the dashboard's "geen antwoord" rule + PS.
export async function vraagknopControle(): Promise<number> {
  const leads = await db<Lead[]>(
    `leads?select=${VELDEN}&status=in.(Opwarmen,Klaar%20om%20te%20sturen)&vraagknop=like.*Getikt*&vraagknop=not.like.*->*`,
  );
  let n = 0;
  for (const lead of leads) {
    const getikt = Date.parse((((lead.vraagknop ?? "").match(/\[(\d{4}-[^\]]+)\]/)) ?? [])[1] ?? "");
    if (!Number.isFinite(getikt) || Date.now() - getikt < WACHT_OP_KNOP_MS) continue;
    await stap(lead, "vraagknop_geen", new Date());
    n++;
  }
  return n;
}
