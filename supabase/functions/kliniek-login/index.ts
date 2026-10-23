// The chatbot (n8n "Alle kanalen") asks this function for a short-lived Supabase token of the right clinic, instead
// of keeping one login credential per clinic in n8n. Every clinic has its own runtime user (table kliniek_runtime,
// app_metadata clinic_id), so the database's row-level security still keeps each clinic in its own data.
// No password is stored anywhere: the token comes from a one-time login link made and used here.
//
// POST {clinic_id}                  website chat: the clinic is known
// POST {kanaal, account_id}         Instagram/Facebook/WhatsApp: the clinic follows from clinic_channels
// Header x-beheercode (n8n credential "Qore beheercode (header)").
//
// A client that does not pay gets no token, so the chatbot stops answering for that clinic (table onboardingen,
// betaalstatus, filled by the Edge Function "onboarding" from Stripe). Clinics without an onboarding row (our own,
// the demo) and clients added by hand have no betaalstatus and always get one.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const BEHEERCODE = Deno.env.get("BEHEERCODE") ?? "";

// Unknown Instagram/Facebook/WhatsApp accounts get the demo clinic, as the workflow did before: its channel row
// is then missing, so the workflow stops without answering.
const DEMO_KLINIEK = "d3110000-0000-4000-a000-000000000001";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Days a client keeps the chatbot after a failed monthly payment. Keep in sync with the "onboarding" function.
const GRATIE_DAGEN = 5;

// Checked here too, not only by the hourly job, so the chatbot stops on time even when that job runs late.
function geblokkeerd(o: { betaalstatus: string | null; betaalprobleem_sinds: string | null } | undefined) {
  if (!o?.betaalstatus) return false;
  if (["wacht_op_betaling", "gestopt", "opgezegd"].includes(o.betaalstatus)) return true;
  return o.betaalstatus === "betaalprobleem" && !!o.betaalprobleem_sinds &&
    Date.now() - Date.parse(o.betaalprobleem_sinds) > GRATIE_DAGEN * 86_400_000;
}

function gelijk(a: string, b: string): boolean {
  let verschil = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) verschil |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
  return verschil === 0;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function lees<T>(pad: string): Promise<T[]> {
  const antwoord = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!antwoord.ok) throw new Error(`Supabase ${antwoord.status}: ${await antwoord.text()}`);
  return await antwoord.json();
}

// Tokens live an hour; each running instance reuses one until 5 minutes before it expires.
const tokens = new Map<string, { token: string; tot: number }>();

async function tokenVoor(email: string): Promise<{ token: string; tot: number }> {
  const link = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", email }),
  });
  const linkData = await link.json().catch(() => ({}));
  const hash = linkData?.hashed_token ?? linkData?.properties?.hashed_token;
  if (!link.ok || !hash) throw new Error(`Login-link mislukt (${link.status})`);

  const sessie = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: ANON_KEY || SERVICE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: hash }),
  });
  const s = await sessie.json().catch(() => ({}));
  if (!sessie.ok || !s?.access_token) throw new Error(`Inloggen mislukt (${sessie.status})`);
  return { token: s.access_token, tot: Date.now() + (Number(s.expires_in) || 3600) * 1000 };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ fout: "Alleen POST" }, 405);
  if (!BEHEERCODE || !gelijk(req.headers.get("x-beheercode") ?? "", BEHEERCODE)) return json({ fout: "Geen toegang" }, 403);

  try {
    const body = await req.json().catch(() => ({}));
    let clinicId = String(body?.clinic_id ?? "").trim();
    if (!clinicId && body?.account_id) {
      const kanaal = String(body.kanaal ?? "").replace(/[^a-z]/g, "");
      const account = String(body.account_id).replace(/[^A-Za-z0-9_]/g, "");
      const [rij] = await lees<{ clinic_id: string }>(
        `clinic_channels?select=clinic_id&channel=eq.${kanaal}&account_id=eq.${account}&limit=1`,
      );
      clinicId = rij?.clinic_id ?? DEMO_KLINIEK;
    }
    if (!UUID.test(clinicId)) return json({ fout: "Ongeldige kliniek" }, 400);

    const [betaling] = await lees<{ betaalstatus: string | null; betaalprobleem_sinds: string | null }>(
      `onboardingen?select=betaalstatus,betaalprobleem_sinds&clinic_id=eq.${clinicId}&order=aangemaakt_op.desc&limit=1`,
    );
    if (geblokkeerd(betaling)) {
      tokens.delete(clinicId);
      return json({ fout: "Deze kliniek is gepauzeerd: er is niet betaald", clinic_id: clinicId, gepauzeerd: true }, 402);
    }

    const bewaard = tokens.get(clinicId);
    if (bewaard && bewaard.tot - Date.now() > 5 * 60_000) return json({ access_token: bewaard.token, clinic_id: clinicId });

    const [runtime] = await lees<{ email: string }>(`kliniek_runtime?select=email&clinic_id=eq.${clinicId}`);
    if (!runtime) return json({ fout: "Deze kliniek heeft nog geen login", clinic_id: clinicId }, 404);
    const nieuw = await tokenVoor(runtime.email);
    tokens.set(clinicId, nieuw);
    return json({ access_token: nieuw.token, clinic_id: clinicId });
  } catch (e) {
    console.error(e);
    return json({ fout: e instanceof Error ? e.message : "Mislukt" }, 500);
  }
});
