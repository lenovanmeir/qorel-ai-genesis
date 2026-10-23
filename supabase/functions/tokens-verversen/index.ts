// Keeps the channel tokens in clinic_channels (encrypted in Vault) alive, so no clinic's chatbot goes silent when a
// token runs out. Two jobs:
//
// 1. {"nacht": true} — pg_cron calls this every night. Instagram tokens (Instagram Login, 60 days) that expire within
//    30 days are refreshed at Meta; tokens of other channels that will expire within 10 days are flagged. Every
//    channel in "fout" is reported to Leno on Telegram, at most once a day. It only acts on what is due, so it needs
//    no key. {"proef": true} reports what it would do without calling Meta or Telegram.
// 2. {"actie": "opslaan", "kanaal_id", "token"} with header x-beheercode — stores a pasted token after checking at
//    Meta that it belongs to that channel's account. The token never leaves this function in a response.
//    {"actie": "lijst"} with the same header lists the channels and their token state for /beheer.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BEHEERCODE = (Deno.env.get("BEHEERCODE") ?? "").trim();
const TELEGRAM_TOKEN = (Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "").trim();
const CHAT_ID = (Deno.env.get("TELEGRAM_CHAT_ID") ?? "423937318").trim();

const DAG = 24 * 60 * 60 * 1000;
const IG_VERVERSEN_VANAF = 30 * DAG; // refresh Instagram tokens that expire within 30 days
const ANDER_WAARSCHUWEN_VANAF = 10 * DAG;
const MELDEN_HOOGSTENS_PER = 20 * 60 * 60 * 1000;

type Kanaal = {
  id: string;
  channel: string;
  account_id: string | null;
  account_label: string | null;
  token_secret_id: string | null;
  token_verloopt_op: string | null;
  token_ververst_op: string | null;
  token_status: string;
  token_fout: string | null;
  token_gemeld_op: string | null;
};

async function db<T>(pad: string, init: RequestInit = {}): Promise<T> {
  const antwoord = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!antwoord.ok) throw new Error(`${pad.split("?")[0]}: ${antwoord.status} ${await antwoord.text()}`);
  const tekst = await antwoord.text();
  return (tekst ? JSON.parse(tekst) : null) as T;
}

const rpc = <T>(naam: string, args: Record<string, unknown>) =>
  db<T>(`rpc/${naam}`, { method: "POST", body: JSON.stringify(args) });

const bijwerken = (id: string, velden: Partial<Kanaal>) =>
  db(`clinic_channels?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(velden) });

const html = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const naamVan = (k: Kanaal) => k.account_label || `${k.channel} ${k.account_id ?? k.id}`;

// Meta's error text without anything that could echo the token back.
async function metaFout(antwoord: Response): Promise<string> {
  try {
    const j = await antwoord.json();
    return String(j?.error?.message ?? `HTTP ${antwoord.status}`).slice(0, 200);
  } catch {
    return `HTTP ${antwoord.status}`;
  }
}

// Instagram Login long-lived token → a new one valid for another ~60 days. Meta refuses tokens younger than 24 h.
async function igVerversen(token: string): Promise<{ token: string; verlooptOp: string }> {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  const antwoord = await fetch(url);
  if (!antwoord.ok) throw new Error(await metaFout(antwoord));
  const j = await antwoord.json();
  if (!j.access_token) throw new Error("geen access_token in het antwoord van Meta");
  const seconden = Number(j.expires_in) || 60 * 24 * 60 * 60;
  return { token: j.access_token, verlooptOp: new Date(Date.now() + seconden * 1000).toISOString() };
}

// Which account a token belongs to, so a token pasted on the wrong channel is refused. A WhatsApp system user token
// belongs to a person, not to the number, so there we only check that it can read the number's account id.
async function accountVanToken(kanaal: string, accountId: string | null, token: string): Promise<string> {
  const url = kanaal === "instagram"
    ? new URL("https://graph.instagram.com/v23.0/me?fields=user_id,username")
    : kanaal === "whatsapp"
    ? new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(accountId ?? "")}?fields=id`)
    : new URL("https://graph.facebook.com/v21.0/me?fields=id,name");
  const antwoord = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!antwoord.ok) throw new Error(await metaFout(antwoord));
  const j = await antwoord.json();
  return String(kanaal === "instagram" ? j.user_id ?? j.id : j.id);
}

async function telegram(tekst: string) {
  if (!TELEGRAM_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN ontbreekt");
  const antwoord = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: tekst, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!antwoord.ok) throw new Error(`Telegram ${antwoord.status}`);
}

async function nacht(proef: boolean) {
  const nu = Date.now();
  const kanalen = await db<Kanaal[]>(
    "clinic_channels?select=id,channel,account_id,account_label,token_secret_id,token_verloopt_op,token_ververst_op,token_status,token_fout,token_gemeld_op&token_secret_id=not.is.null",
  );
  const verslag: Record<string, string>[] = [];

  for (const k of kanalen) {
    const verloopt = k.token_verloopt_op ? Date.parse(k.token_verloopt_op) : null;
    const ververst = k.token_ververst_op ? Date.parse(k.token_ververst_op) : 0;

    if (k.channel === "instagram") {
      const nodig = verloopt === null || verloopt - nu < IG_VERVERSEN_VANAF;
      if (!nodig) { verslag.push({ kanaal: naamVan(k), gedaan: "niets, nog geldig" }); continue; }
      if (nu - ververst < DAG) { verslag.push({ kanaal: naamVan(k), gedaan: "wacht, jonger dan 24 uur" }); continue; }
      if (proef) { verslag.push({ kanaal: naamVan(k), gedaan: "zou verversen" }); continue; }
      try {
        const oud = await rpc<string | null>("kanaal_token_lezen", { p_kanaal_id: k.id });
        if (!oud) throw new Error("token niet gevonden in Vault");
        const nieuw = await igVerversen(oud);
        await rpc("kanaal_token_zetten", { p_kanaal_id: k.id, p_token: nieuw.token, p_verloopt_op: nieuw.verlooptOp });
        k.token_status = "ok";
        verslag.push({ kanaal: naamVan(k), gedaan: `ververst tot ${nieuw.verlooptOp.slice(0, 10)}` });
      } catch (e) {
        k.token_status = "fout";
        k.token_fout = `Verversen mislukt: ${(e as Error).message}`;
        await bijwerken(k.id, { token_status: "fout", token_fout: k.token_fout });
        verslag.push({ kanaal: naamVan(k), gedaan: k.token_fout });
      }
      continue;
    }

    // Facebook page and WhatsApp system user tokens don't expire; only warn when one has an end date coming up.
    if (verloopt !== null && verloopt - nu < ANDER_WAARSCHUWEN_VANAF && k.token_status !== "fout") {
      k.token_status = "fout";
      k.token_fout = `Verloopt op ${k.token_verloopt_op!.slice(0, 10)}, opnieuw koppelen`;
      if (!proef) await bijwerken(k.id, { token_status: "fout", token_fout: k.token_fout });
    }
    verslag.push({ kanaal: naamVan(k), gedaan: k.token_status === "fout" ? k.token_fout ?? "fout" : "niets nodig" });
  }

  const melden = kanalen.filter((k) =>
    k.token_status === "fout" && (!k.token_gemeld_op || nu - Date.parse(k.token_gemeld_op) > MELDEN_HOOGSTENS_PER)
  );
  if (melden.length && !proef) {
    const regels = melden.map((k) => `• <b>${html(naamVan(k))}</b>: ${html(k.token_fout ?? "onbekende fout")}`);
    await telegram(
      [`⚠️ <b>Kanaal opnieuw koppelen</b>`, "", ...regels, "", "De AI antwoordt daar niet meer zodra het token verloopt."]
        .join("\n"),
    );
    const tijd = new Date().toISOString();
    for (const k of melden) await bijwerken(k.id, { token_gemeld_op: tijd });
  }

  return { kanalen: kanalen.length, gemeld: proef ? 0 : melden.length, verslag };
}

async function opslaan(kanaalId: string, token: string) {
  const rijen = await db<Kanaal[]>(`clinic_channels?select=id,channel,account_id,account_label&id=eq.${kanaalId}`);
  const k = rijen[0];
  if (!k) return { status: 404, body: { ok: false, fout: "kanaal bestaat niet" } };

  const account = await accountVanToken(k.channel, k.account_id, token.trim());
  if (k.account_id && account !== k.account_id) {
    return { status: 400, body: { ok: false, fout: `token hoort bij account ${account}, niet bij ${k.account_id}` } };
  }

  let bewaar = token.trim();
  let verlooptOp: string | null = null;
  if (k.channel === "instagram") {
    // A token older than 24 h can be refreshed right away, which also tells us its exact end date.
    try {
      const nieuw = await igVerversen(bewaar);
      bewaar = nieuw.token;
      verlooptOp = nieuw.verlooptOp;
    } catch {
      verlooptOp = new Date(Date.now() + 60 * DAG).toISOString();
    }
  }
  await rpc("kanaal_token_zetten", { p_kanaal_id: k.id, p_token: bewaar, p_verloopt_op: verlooptOp });
  return { status: 200, body: { ok: true, kanaal: naamVan(k), verloopt_op: verlooptOp } };
}

// /beheer calls "lijst" and "opslaan" from the browser.
const BEHEER_ORIGINS = new Set([
  "https://qoreaesthetics.com",
  "https://www.qoreaesthetics.com",
  "http://localhost:8080",
  "http://aesthetics.localhost:8080",
]);

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = {
    "Access-Control-Allow-Origin": origin && BEHEER_ORIGINS.has(origin) ? origin : "https://qoreaesthetics.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-beheercode",
    Vary: "Origin",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response("Alleen POST", { status: 405, headers: cors });
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* empty body = night run */ }

  try {
    if (body.actie === "opslaan" || body.actie === "lijst") {
      if (!BEHEERCODE || (req.headers.get("x-beheercode") ?? "").trim() !== BEHEERCODE) {
        return json({ ok: false, fout: "geen toegang" }, 403);
      }
    }
    // The channels with their token state for /beheer; never the token itself.
    if (body.actie === "lijst") {
      const kanalen = await db<unknown[]>(
        "clinic_channels?select=id,channel,account_id,account_label,is_enabled,token_status,token_verloopt_op,token_ververst_op,token_fout,clinics(name)&order=channel,account_label",
      );
      return json({ ok: true, kanalen });
    }
    if (body.actie === "opslaan") {
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof body.kanaal_id !== "string" || !uuid.test(body.kanaal_id) || typeof body.token !== "string" || !body.token.trim()) {
        return json({ ok: false, fout: "kanaal_id en token zijn verplicht" }, 400);
      }
      const { status, body: uit } = await opslaan(body.kanaal_id, body.token);
      return json(uit, status);
    }
    return json({ ok: true, ...(await nacht(body.proef === true)) });
  } catch (e) {
    console.error("tokens-verversen", (e as Error).message);
    return json({ ok: false, fout: (e as Error).message }, 500);
  }
});
