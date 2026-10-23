// Meta (Instagram, Facebook, WhatsApp) calls this instead of n8n directly. It checks Meta's X-Hub-Signature-256
// with the app secret, so nobody else can post fake messages that make the AI answer or cost money, and then hands
// the untouched message to the n8n workflow "Alle kanalen". The verification call (GET) is passed through as well.
//
// META_APP_SECRET is the Facebook app secret (Facebook Page and WhatsApp webhooks); META_IG_APP_SECRET, if set, is the
// Instagram app secret (Instagram Login webhooks). While STRENG is not "1" a bad signature is only logged and the
// message still goes through, so switching Meta to this function can never silence the chatbot.
//
// Since 23/10 messages between @qoreaesthetics and a lead (outreach) are handled in leads.ts and not passed on: they
// update the lead instead of reaching the AI. POST ?controle=vraagknop is the 15-minute question-button check.

import { leadSignaal, vraagknopControle } from "./leads.ts";

const N8N_URL = "https://qorelabs.app.n8n.cloud/webhook/qore-instagram-test";
const GEHEIMEN = [Deno.env.get("META_APP_SECRET"), Deno.env.get("META_IG_APP_SECRET")]
  .map((g) => (g ?? "").trim())
  .filter(Boolean);
const STRENG = (Deno.env.get("META_HANDTEKENING_STRENG") ?? "").trim() === "1";
// Own key for the Meta -> n8n hop (not the beheercode): n8n stores every incoming header in its execution history,
// so this key may only open this one webhook.
const SLEUTEL = (Deno.env.get("N8N_META_SLEUTEL") ?? "").trim();
const SLEUTEL_KOP = SLEUTEL ? { "x-qore-sleutel": SLEUTEL } : {};

async function hmacHex(geheim: string, ruw: Uint8Array): Promise<string> {
  const sleutel = await crypto.subtle.importKey("raw", new TextEncoder().encode(geheim), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", sleutel, ruw));
  return [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time compare.
function gelijk(a: string, b: string): boolean {
  let verschil = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) verschil |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
  return verschil === 0;
}

// Which secret signed the message: "facebook", "instagram", or null when none matches.
async function ondertekendDoor(ruw: Uint8Array, kop: string): Promise<string | null> {
  const verwacht = kop.replace(/^sha256=/, "").trim().toLowerCase();
  if (!verwacht) return null;
  const namen = ["facebook", "instagram"];
  const geheimen = [Deno.env.get("META_APP_SECRET"), Deno.env.get("META_IG_APP_SECRET")];
  for (let i = 0; i < geheimen.length; i++) {
    const g = (geheimen[i] ?? "").trim();
    if (g && gelijk(await hmacHex(g, ruw), verwacht)) return namen[i];
  }
  return null;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Meta's subscription check (hub.mode, hub.verify_token, hub.challenge): n8n checks the verify token and answers.
  if (req.method === "GET") {
    const antwoord = await fetch(`${N8N_URL}${url.search}`, { headers: SLEUTEL_KOP });
    return new Response(await antwoord.text(), { status: antwoord.status, headers: { "Content-Type": "text/plain" } });
  }
  if (req.method !== "POST") return new Response("Alleen GET en POST", { status: 405 });

  // pg_cron, no key needed: it only applies what the clock already decides.
  if (url.searchParams.get("controle") === "vraagknop") {
    try {
      return Response.json({ bijgewerkt: await vraagknopControle() });
    } catch (e) {
      console.error("vraagknop-controle", (e as Error).message);
      return Response.json({ fout: (e as Error).message }, { status: 500 });
    }
  }

  let ruw = new Uint8Array(await req.arrayBuffer());
  const kop = req.headers.get("x-hub-signature-256") ?? "";
  const door = GEHEIMEN.length ? await ondertekendDoor(ruw, kop) : null;
  let soort = "";
  try {
    soort = JSON.parse(new TextDecoder().decode(ruw))?.object ?? "";
  } catch { /* not JSON */ }
  console.log(JSON.stringify({
    handtekening: door ?? (kop ? "fout" : "ontbreekt"),
    object: soort,
    streng: STRENG,
    // Which secrets are set (never their values), so a "fout" can be told apart from a missing secret.
    geheimen: { facebook: !!(Deno.env.get("META_APP_SECRET") ?? "").trim(), instagram: !!(Deno.env.get("META_IG_APP_SECRET") ?? "").trim() },
  }));

  if (!door && STRENG) return new Response("Handtekening klopt niet", { status: 401 });

  // Outreach messages with a lead are handled here; only the rest goes to n8n. If this fails, everything goes to n8n
  // as before, so a customer message is never lost.
  if (door && soort === "instagram") {
    try {
      const body = JSON.parse(new TextDecoder().decode(ruw));
      let weg = 0;
      for (const entry of body.entry ?? []) {
        const over = [];
        for (const ev of entry.messaging ?? []) {
          let afgehandeld = false;
          try {
            afgehandeld = await leadSignaal(String(entry.id ?? ""), ev);
          } catch (e) {
            console.error("lead-signaal", (e as Error).message);
          }
          if (afgehandeld) weg++;
          else over.push(ev);
        }
        if (entry.messaging) entry.messaging = over;
      }
      if (weg) {
        body.entry = (body.entry ?? []).filter((e: { messaging?: unknown[]; changes?: unknown[] }) => (e.messaging?.length ?? 0) > 0 || e.changes);
        if (!body.entry.length) return new Response("EVENT_RECEIVED", { status: 200 });
        ruw = new TextEncoder().encode(JSON.stringify(body));
      }
    } catch (e) {
      console.error("lead-signaal", (e as Error).message);
    }
  }

  // 200 to Meta once n8n accepted the message; n8n confirms receipt straight away and works on it after.
  try {
    const antwoord = await fetch(N8N_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-qore-handtekening": door ?? "fout",
        ...SLEUTEL_KOP,
      },
      body: ruw,
    });
    // n8n refused it (e.g. 403 when the key does not match): don't tell Meta it arrived, or the message is lost.
    if (!antwoord.ok) {
      console.error(JSON.stringify({ n8n_status: antwoord.status }));
      return new Response("n8n weigerde het bericht", { status: 500 });
    }
  } catch (e) {
    console.error("Doorsturen naar n8n mislukt", e);
    // 500 makes Meta retry later.
    return new Response("Doorsturen mislukt", { status: 500 });
  }
  return new Response("EVENT_RECEIVED", { status: 200 });
});
