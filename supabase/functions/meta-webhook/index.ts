// Meta (Instagram, Facebook, WhatsApp) calls this instead of n8n directly. It checks Meta's X-Hub-Signature-256
// with the app secret, so nobody else can post fake messages that make the AI answer or cost money, and then hands
// the untouched message to the n8n workflow "Alle kanalen". The verification call (GET) is passed through as well.
//
// META_APP_SECRET is the Facebook app secret (Facebook Page and WhatsApp webhooks); META_IG_APP_SECRET, if set, is the
// Instagram app secret (Instagram Login webhooks). While STRENG is not "1" a bad signature is only logged and the
// message still goes through, so switching Meta to this function can never silence the chatbot.

const N8N_URL = "https://qorelabs.app.n8n.cloud/webhook/qore-instagram-test";
const GEHEIMEN = [Deno.env.get("META_APP_SECRET"), Deno.env.get("META_IG_APP_SECRET")]
  .map((g) => (g ?? "").trim())
  .filter(Boolean);
const STRENG = (Deno.env.get("META_HANDTEKENING_STRENG") ?? "").trim() === "1";
const BEHEERCODE = (Deno.env.get("BEHEERCODE") ?? "").trim();

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
    const antwoord = await fetch(`${N8N_URL}${url.search}`, { headers: BEHEERCODE ? { "x-beheercode": BEHEERCODE } : {} });
    return new Response(await antwoord.text(), { status: antwoord.status, headers: { "Content-Type": "text/plain" } });
  }
  if (req.method !== "POST") return new Response("Alleen GET en POST", { status: 405 });

  const ruw = new Uint8Array(await req.arrayBuffer());
  const kop = req.headers.get("x-hub-signature-256") ?? "";
  const door = GEHEIMEN.length ? await ondertekendDoor(ruw, kop) : null;
  let soort = "";
  try {
    soort = JSON.parse(new TextDecoder().decode(ruw))?.object ?? "";
  } catch { /* not JSON */ }
  console.log(JSON.stringify({ handtekening: door ?? (kop ? "fout" : "ontbreekt"), object: soort, streng: STRENG }));

  if (!door && STRENG) return new Response("Handtekening klopt niet", { status: 401 });

  // Always 200 to Meta once the message is accepted; n8n confirms receipt straight away and works on it after.
  try {
    await fetch(N8N_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-qore-handtekening": door ?? "fout",
        ...(BEHEERCODE ? { "x-beheercode": BEHEERCODE } : {}),
      },
      body: ruw,
    });
  } catch (e) {
    console.error("Doorsturen naar n8n mislukt", e);
    // 500 makes Meta retry later.
    return new Response("Doorsturen mislukt", { status: 500 });
  }
  return new Response("EVENT_RECEIVED", { status: 200 });
});
