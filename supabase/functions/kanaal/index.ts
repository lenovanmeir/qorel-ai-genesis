// Sends a chatbot answer (or fetches a customer's Instagram profile) on behalf of n8n with the channel's own token
// from Vault. The token never reaches n8n, so it is not stored in n8n's execution history, and a new clinic needs no
// n8n credential or extra branch: one row in clinic_channels with a token is enough.
//
// POST with header x-qore-sleutel (= N8N_META_SLEUTEL, the same key n8n already uses for the Meta webhook):
//   {"actie": "bericht", "channel", "account_id", "send_body"}  → Meta's answer, as the old n8n send nodes got it
//   {"actie": "profiel", "channel", "account_id", "user_id"}    → {name, username} (Instagram only, else {})
// When the channel has no token in Supabase yet the answer is {"geen_token": true}, and n8n falls back to its old
// credential nodes. That fallback goes once every channel has its token here.
// Every call Meta refuses is written to table kanaal_fouten. When Meta refuses the token itself (HTTP 401 or error
// code 190) the channel is marked "fout" and Leno gets a Telegram message at once, at most once per 20 hours per
// channel (the same token_gemeld_op the nightly check uses, so he never gets both).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SLEUTEL = (Deno.env.get("N8N_META_SLEUTEL") ?? "").trim();
const TELEGRAM_TOKEN = (Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "").trim();
const CHAT_ID = (Deno.env.get("TELEGRAM_CHAT_ID") ?? "423937318").trim();
const MELDEN_HOOGSTENS_PER = 20 * 3600 * 1000;

type Kanaal = {
  id: string;
  channel: string;
  account_id: string;
  account_label: string | null;
  token_secret_id: string | null;
  clinics: { name: string } | null;
};
type MetaFout = { error?: { code?: number; error_subcode?: number; message?: string } };

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

function gelijk(a: string, b: string): boolean {
  let verschil = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) verschil |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
  return verschil === 0;
}

const html = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Writes what Meta answered; on a refused token also marks the channel and tells Leno. Never throws: the answer to
// n8n must not depend on the logging.
async function foutVastleggen(k: Kanaal, actie: "bericht" | "profiel", status: number, j: MetaFout) {
  const geweigerd = status === 401 || j?.error?.code === 190;
  const bericht = String(j?.error?.message ?? "").slice(0, 300) || null;
  console.error(JSON.stringify({ kanaal: k.channel, account: k.account_id, actie, meta_status: status, code: j?.error?.code, fout: bericht }));
  try {
    await db("kanaal_fouten", {
      method: "POST",
      body: JSON.stringify({
        kanaal_id: k.id,
        channel: k.channel,
        account_id: k.account_id,
        actie,
        http_status: status,
        meta_code: j?.error?.code ?? null,
        meta_subcode: j?.error?.error_subcode ?? null,
        bericht,
        token_geweigerd: geweigerd,
      }),
    });
    if (!geweigerd) return;

    const tokenFout = `Meta weigert het token (${status}${j?.error?.code ? `, code ${j.error.code}` : ""}): ${bericht ?? "geen uitleg"}`.slice(0, 200);
    await db(`clinic_channels?id=eq.${k.id}`, { method: "PATCH", body: JSON.stringify({ token_status: "fout", token_fout: tokenFout }) });

    // Claim the message in the database first: only the call whose PATCH returns the row sends it, so ten messages
    // failing at the same moment still give one Telegram.
    const grens = new Date(Date.now() - MELDEN_HOOGSTENS_PER).toISOString();
    const geclaimd = await db<unknown[]>(
      `clinic_channels?id=eq.${k.id}&or=(token_gemeld_op.is.null,token_gemeld_op.lt.${grens})`,
      { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ token_gemeld_op: new Date().toISOString() }) },
    );
    if (!geclaimd.length || !TELEGRAM_TOKEN) return;
    const naam = [k.clinics?.name, k.account_label ?? k.account_id].filter(Boolean).join(" · ");
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        text: [
          `🚨 <b>Token geweigerd: ${html(naam)}</b> (${html(k.channel)})`,
          html(tokenFout),
          "",
          actie === "bericht" ? "Dit antwoord is niet aangekomen bij de klant." : "Het profiel van de klant kon niet worden opgehaald.",
          "Maak een nieuw token aan en plak het op https://qoreaesthetics.com/beheer (Kanaal-tokens).",
        ].join("\n"),
      }),
    });
  } catch (e) {
    console.error("fout vastleggen", (e as Error).message);
  }
}

const VERZEND_URL: Record<string, (k: Kanaal) => string> = {
  instagram: () => "https://graph.instagram.com/v23.0/me/messages",
  facebook: () => "https://graph.facebook.com/v21.0/me/messages",
  whatsapp: (k) => `https://graph.facebook.com/v21.0/${encodeURIComponent(k.account_id)}/messages`,
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Alleen POST", { status: 405 });
  if (!SLEUTEL || !gelijk((req.headers.get("x-qore-sleutel") ?? "").trim(), SLEUTEL)) {
    return Response.json({ ok: false, fout: "geen toegang" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, fout: "geen JSON" }, { status: 400 });
  }
  const channel = String(body.channel ?? "");
  const accountId = String(body.account_id ?? "");
  if (!VERZEND_URL[channel] || !/^[A-Za-z0-9_]+$/.test(accountId)) {
    return Response.json({ ok: false, fout: "channel of account_id ongeldig" }, { status: 400 });
  }

  try {
    const rijen = await db<Kanaal[]>(
      `clinic_channels?select=id,channel,account_id,account_label,token_secret_id,clinics(name)&channel=eq.${channel}&account_id=eq.${accountId}&limit=1`,
    );
    const k = rijen[0];
    const token = k?.token_secret_id
      ? await db<string | null>("rpc/kanaal_token_lezen", { method: "POST", body: JSON.stringify({ p_kanaal_id: k.id }) })
      : null;
    if (!k || !token) return Response.json({ geen_token: true });

    if (body.actie === "profiel") {
      const userId = String(body.user_id ?? "");
      if (channel !== "instagram" || !/^[0-9]+$/.test(userId)) return Response.json({});
      const antwoord = await fetch(`https://graph.instagram.com/v23.0/${userId}?fields=name,username`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await antwoord.json().catch(() => ({}));
      // @ts-ignore EdgeRuntime exists in Supabase Edge Functions
      if (!antwoord.ok) EdgeRuntime.waitUntil(foutVastleggen(k, "profiel", antwoord.status, j));
      // Same shape the old profile node gave "Klant opslaan": name and username, or nothing.
      return Response.json(antwoord.ok ? { name: j.name, username: j.username } : {});
    }

    if (body.actie === "bericht") {
      const antwoord = await fetch(VERZEND_URL[channel](k), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body.send_body ?? {}),
      });
      const j = await antwoord.json().catch(() => ({}));
      // Logged and reported after the answer, so n8n is not kept waiting on Telegram.
      // @ts-ignore EdgeRuntime exists in Supabase Edge Functions
      if (!antwoord.ok) EdgeRuntime.waitUntil(foutVastleggen(k, "bericht", antwoord.status, j));
      return Response.json(j, { status: antwoord.ok ? 200 : 502 });
    }

    return Response.json({ ok: false, fout: "onbekende actie" }, { status: 400 });
  } catch (e) {
    console.error("kanaal", (e as Error).message);
    return Response.json({ ok: false, fout: (e as Error).message }, { status: 500 });
  }
});
