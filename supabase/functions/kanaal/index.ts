// Sends a chatbot answer (or fetches a customer's Instagram profile) on behalf of n8n with the channel's own token
// from Vault. The token never reaches n8n, so it is not stored in n8n's execution history, and a new clinic needs no
// n8n credential or extra branch: one row in clinic_channels with a token is enough.
//
// POST with header x-qore-sleutel (= N8N_META_SLEUTEL, the same key n8n already uses for the Meta webhook):
//   {"actie": "bericht", "channel", "account_id", "send_body"}  → Meta's answer, as the old n8n send nodes got it
//   {"actie": "profiel", "channel", "account_id", "user_id"}    → {name, username} (Instagram only, else {})
// When the channel has no token in Supabase yet the answer is {"geen_token": true}, and n8n falls back to its old
// credential nodes. That fallback goes once every channel has its token here.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SLEUTEL = (Deno.env.get("N8N_META_SLEUTEL") ?? "").trim();

type Kanaal = { id: string; channel: string; account_id: string; token_secret_id: string | null };

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
      `clinic_channels?select=id,channel,account_id,token_secret_id&channel=eq.${channel}&account_id=eq.${accountId}&limit=1`,
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
      // An invalid or expired token: mark it so the nightly check reports it to Leno.
      if (j?.error?.code === 190) {
        await db(`clinic_channels?id=eq.${k.id}`, {
          method: "PATCH",
          body: JSON.stringify({ token_status: "fout", token_fout: `Meta weigert het token: ${String(j.error.message).slice(0, 160)}` }),
        });
      }
      if (!antwoord.ok) console.error(JSON.stringify({ kanaal: channel, account: accountId, meta_status: antwoord.status, fout: j?.error?.message }));
      return Response.json(j, { status: antwoord.ok ? 200 : 502 });
    }

    return Response.json({ ok: false, fout: "onbekende actie" }, { status: 400 });
  } catch (e) {
    console.error("kanaal", (e as Error).message);
    return Response.json({ ok: false, fout: (e as Error).message }, { status: 500 });
  }
});
