// The website widget (qoreaesthetics.com/widget.js) talks only to this function, never to n8n directly.
// It checks that the page the widget runs on belongs to the clinic, slows down visitors who send too much and stops
// a clinic at its daily cap, so nobody can use a clinic's AI on another site or run up its costs.
//
// GET  ?kliniek=slug                 the widget's look, welcome text and choice buttons (public, cached 5 minutes)
// POST {kliniek, bericht, ...}       one chat message, passed on to the n8n workflow "Alle kanalen"
// With x-beheercode (the /beheer page):
// GET  ?beheer=1                     every clinic's widget settings
// GET  ?test=slug                    is the script tag on the clinic's site?
// POST {instellingen: {...}}         save one clinic's settings

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BEHEERCODE = Deno.env.get("BEHEERCODE") ?? "";
const N8N_CHAT = "https://qorelabs.app.n8n.cloud/webhook/qore-alle-kanalen-chat";

// Our own sites may always show any clinic's widget: Leno previews it there before the clinic installs it.
const ALTIJD = [/^(www\.)?qoreaesthetics\.com$/, /^localhost$/, /^(.+\.)?localhost$/];
const BEHEER_ORIGINS = new Set([
  "https://qoreaesthetics.com",
  "https://www.qoreaesthetics.com",
  "http://localhost:8080",
  "http://aesthetics.localhost:8080",
]);

const SLUG = /^[a-z0-9-]{2,60}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TALEN = ["nl", "fr", "en"] as const;

type Instellingen = {
  clinic_id: string;
  kleur: string;
  logo_url: string | null;
  weergavenaam: string | null;
  welkom_nl: string | null;
  welkom_fr: string | null;
  welkom_en: string | null;
  domeinen: string[];
  positie: string;
  max_per_dag: number;
  is_actief: boolean;
  clinics: { name: string; slug: string; website_url: string | null; is_active: boolean };
};

const KOLOMMEN =
  "clinic_id,kleur,logo_url,weergavenaam,welkom_nl,welkom_fr,welkom_en,domeinen,positie,max_per_dag,is_actief,clinics!inner(name,slug,website_url,is_active)";

async function rest(pad: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...init.headers },
  });
}

async function lees<T>(pad: string): Promise<T[]> {
  const antwoord = await rest(pad);
  if (!antwoord.ok) throw new Error(`Supabase ${antwoord.status}: ${await antwoord.text()}`);
  return await antwoord.json();
}

// Settings change rarely and every page view of a clinic's site asks for them, so each instance keeps them a minute.
const geheugen = new Map<string, { op: number; inst: Instellingen | null }>();
async function instellingenVan(slug: string): Promise<Instellingen | null> {
  const bewaard = geheugen.get(slug);
  if (bewaard && Date.now() - bewaard.op < 60_000) return bewaard.inst;
  const [inst] = await lees<Instellingen>(`widget_instellingen?select=${KOLOMMEN}&clinics.slug=eq.${slug}`);
  geheugen.set(slug, { op: Date.now(), inst: inst ?? null });
  return inst ?? null;
}

const hostVan = (origin: string | null) => {
  try {
    return origin ? new URL(origin).hostname.toLowerCase() : "";
  } catch {
    return "";
  }
};

// The clinic's own domains, including www. and other subdomains.
function magOp(host: string, inst: Instellingen): boolean {
  if (!host) return false;
  if (ALTIJD.some((r) => r.test(host))) return true;
  return inst.domeinen.some((d) => host === d || host.endsWith(`.${d}`));
}

// At most 20 messages per visitor (IP) per 5 minutes, per running instance: enough for a real conversation.
const perIp = new Map<string, number[]>();
function teVeel(ip: string): boolean {
  const nu = Date.now();
  const recent = (perIp.get(ip) ?? []).filter((t) => nu - t < 5 * 60_000);
  recent.push(nu);
  perIp.set(ip, recent);
  if (perIp.size > 5000) perIp.clear();
  return recent.length > 20;
}

const AI_MELDING = {
  nl: "Je praat met een AI-assistent. Typ \"mens\" om een medewerker te spreken.",
  fr: "Vous parlez avec un assistant IA. Tapez « humain » pour parler à quelqu'un.",
  en: "You're chatting with an AI assistant. Type \"human\" to reach a person.",
};

const STANDAARD_WELKOM = {
  nl: (naam: string) => `Hoi! Ik ben de AI-receptioniste van ${naam}. Waarmee kan ik je helpen?`,
  fr: (naam: string) => `Bonjour ! Je suis la réceptionniste IA de ${naam}. Comment puis-je vous aider ?`,
  en: (naam: string) => `Hi! I'm the AI receptionist of ${naam}. How can I help?`,
};

type Keuze = { code: string; actie: string; label_nl: string; label_fr: string; label_en: string; vraag_nl: string; vraag_fr: string; vraag_en: string };

async function publiekeConfig(inst: Instellingen) {
  const keuzes = await lees<Keuze>(
    `chat_keuzes?select=code,actie,label_nl,label_fr,label_en,vraag_nl,vraag_fr,vraag_en&clinic_id=eq.${inst.clinic_id}&is_actief=eq.true&order=positie.asc&limit=3`,
  ).catch(() => []);
  const naam = inst.weergavenaam || inst.clinics.name;
  return {
    naam,
    kleur: inst.kleur,
    logo: inst.logo_url,
    positie: inst.positie,
    welkom: Object.fromEntries(TALEN.map((t) => [t, inst[`welkom_${t}`] || STANDAARD_WELKOM[t](naam)])),
    ai_melding: AI_MELDING,
    keuzes: keuzes.map((k) => ({
      code: k.code,
      actie: k.actie,
      label: { nl: k.label_nl, fr: k.label_fr, en: k.label_en },
      vraag: { nl: k.vraag_nl, fr: k.vraag_fr, en: k.vraag_en },
    })),
  };
}

type Geschiedenis = { role: string; content: string }[];

async function chat(inst: Instellingen, body: Record<string, unknown>) {
  const bericht = String(body.bericht ?? "").replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 1000);
  if (!bericht) return { status: 400, data: { fout: "Leeg bericht" } };
  const taal = TALEN.includes(body.taal as never) ? body.taal : "nl";
  const gesprek = typeof body.gesprek === "string" && UUID.test(body.gesprek) ? body.gesprek : "";
  // The brain does not load website history itself, so the widget sends the last messages of this tab.
  const geschiedenis = (Array.isArray(body.geschiedenis) ? (body.geschiedenis as Geschiedenis) : []).slice(-10).map((h) => ({
    role: h?.role === "assistant" ? "assistant" : "user",
    content: String(h?.content ?? "").slice(0, 1500),
  }));
  const keuze = typeof body.keuze === "string" && /^[A-Z0-9_]{1,30}$/.test(body.keuze) ? body.keuze : null;
  const keuzeActie = body.keuze_actie === "agenda" || body.keuze_actie === "vraag" ? body.keuze_actie : null;

  const antwoord = await fetch(N8N_CHAT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinic_id: inst.clinic_id,
      message: bericht,
      conversation_id: gesprek,
      lang: taal,
      history: geschiedenis,
      choice: keuze,
      choice_action: keuzeActie,
      channel: "website",
    }),
  });
  const data = await antwoord.json().catch(() => null);
  if (!antwoord.ok || typeof data?.reply !== "string") {
    console.error(JSON.stringify({ n8n: antwoord.status, velden: data ? Object.keys(data) : null, fout: data?.error_code }));
    return { status: 502, data: { fout: "Geen antwoord" } };
  }
  return { status: 200, data: { antwoord: data.reply, gesprek: data.conversation_id ?? gesprek, intent: data.intent ?? null } };
}

// ---- /beheer ----

function gelijk(a: string, b: string): boolean {
  let verschil = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) verschil |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
  return verschil === 0;
}

const schoonDomein = (d: string) =>
  d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[/?#].*$/, "");
const DOMEIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

async function bewaar(i: Record<string, unknown>) {
  const clinicId = String(i?.clinic_id ?? "");
  if (!UUID.test(clinicId)) throw new Error("Ongeldige kliniek");
  const domeinen = [...new Set((Array.isArray(i.domeinen) ? i.domeinen : []).map((d) => schoonDomein(String(d))).filter(Boolean))];
  if (domeinen.some((d) => !DOMEIN.test(d))) throw new Error("Een domein klopt niet (bv. kliniek.be)");
  const kleur = String(i.kleur ?? "#9a9cff");
  if (!/^#[0-9a-fA-F]{6}$/.test(kleur)) throw new Error("Kleur moet zoals #9a9cff zijn");
  const logo = String(i.logo_url ?? "").trim();
  if (logo && !/^https:\/\//.test(logo)) throw new Error("Logo moet een https-link zijn");
  const tekst = (v: unknown) => (String(v ?? "").trim().slice(0, 300) || null);
  const rij = {
    clinic_id: clinicId,
    kleur,
    logo_url: logo || null,
    weergavenaam: tekst(i.weergavenaam),
    welkom_nl: tekst(i.welkom_nl),
    welkom_fr: tekst(i.welkom_fr),
    welkom_en: tekst(i.welkom_en),
    domeinen,
    positie: i.positie === "links" ? "links" : "rechts",
    max_per_dag: Math.min(5000, Math.max(1, Number(i.max_per_dag) || 300)),
    is_actief: i.is_actief !== false,
    gewijzigd_op: new Date().toISOString(),
  };
  const antwoord = await rest("widget_instellingen?on_conflict=clinic_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rij),
  });
  if (!antwoord.ok) throw new Error(`Bewaren lukte niet (${antwoord.status})`);
  geheugen.clear();
}

// Fetches the clinic's home page and looks for our script tag with its slug.
async function testSite(slug: string) {
  const inst = await instellingenVan(slug);
  if (!inst) return { gevonden: false, uitleg: "Deze kliniek heeft nog geen widget-instellingen." };
  const domein = inst.domeinen[0];
  if (!domein) return { gevonden: false, uitleg: "Er staat nog geen website bij de toegestane domeinen." };
  const url = `https://${domein}/`;
  try {
    const antwoord = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "QoreWidgetTest/1.0" } });
    const html = (await antwoord.text()).slice(0, 2_000_000);
    const script = /qoreaesthetics\.com\/widget\.js/.test(html);
    const juist = new RegExp(`data-kliniek=["']${slug}["']`).test(html);
    if (script && juist) return { gevonden: true, url, uitleg: "De widget staat op de site." };
    if (script) return { gevonden: false, url, uitleg: "Het script staat erop, maar met een andere data-kliniek." };
    return { gevonden: false, url, uitleg: "Niet gevonden in de broncode van de homepage (soms laadt een websitebouwer het later in; kijk dan zelf op de site)." };
  } catch {
    return { gevonden: false, url, uitleg: "De site kon niet geopend worden." };
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const url = new URL(req.url);
  const isBeheer = req.headers.has("x-beheercode") || url.searchParams.has("beheer") || url.searchParams.has("test");

  // Widget calls may come from any clinic site (checked per clinic below); beheer calls only from our own site.
  const cors: Record<string, string> = {
    "Access-Control-Allow-Origin": isBeheer ? (origin && BEHEER_ORIGINS.has(origin) ? origin : "https://qoreaesthetics.com") : origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-beheercode",
    Vary: "Origin",
  };
  const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  if (isBeheer) {
    if (!BEHEERCODE || !gelijk(req.headers.get("x-beheercode") ?? "", BEHEERCODE)) return json({ fout: "Beheercode klopt niet" }, 403);
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        await bewaar(body?.instellingen);
        return json({ ok: true });
      }
      const test = url.searchParams.get("test");
      if (test !== null) return SLUG.test(test) ? json(await testSite(test)) : json({ fout: "Ongeldige kliniek" }, 400);
      const [rijen, klinieken] = await Promise.all([
        lees<Instellingen>(`widget_instellingen?select=${KOLOMMEN}&order=aangemaakt_op.asc`),
        lees<{ id: string; name: string; slug: string; website_url: string | null }>("clinics?select=id,name,slug,website_url&is_active=eq.true&order=name.asc"),
      ]);
      return json({ widgets: rijen, klinieken });
    } catch (e) {
      console.error(e);
      return json({ fout: e instanceof Error ? e.message : "Mislukt" }, 400);
    }
  }

  try {
    if (req.method === "GET") {
      const slug = url.searchParams.get("kliniek") ?? "";
      if (!SLUG.test(slug)) return json({ fout: "Onbekende kliniek" }, 404);
      const inst = await instellingenVan(slug);
      if (!inst || !inst.is_actief || !inst.clinics.is_active) return json({ actief: false }, 200, { "Cache-Control": "public, max-age=300" });
      // A browser always sends Origin on these cross-site fetches; the widget stays hidden on sites that aren't the clinic's.
      if (!magOp(hostVan(origin), inst)) return json({ actief: false, reden: "domein" }, 200);
      return json({ actief: true, ...(await publiekeConfig(inst)) }, 200, { "Cache-Control": "public, max-age=300" });
    }

    if (req.method !== "POST") return json({ fout: "Alleen GET en POST" }, 405);
    const body = await req.json().catch(() => ({}));
    const slug = String(body?.kliniek ?? "");
    const inst = SLUG.test(slug) ? await instellingenVan(slug) : null;
    if (!inst || !inst.is_actief || !inst.clinics.is_active) return json({ fout: "Onbekende kliniek" }, 404);
    if (!magOp(hostVan(origin), inst)) return json({ fout: "Deze website mag de widget niet gebruiken" }, 403);

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "onbekend";
    if (teVeel(ip)) return json({ fout: "te_veel" }, 429);
    const { data: onderLimiet } = await rest("rpc/widget_tel", {
      method: "POST",
      body: JSON.stringify({ p_clinic: inst.clinic_id, p_max: inst.max_per_dag }),
    }).then(async (r) => ({ data: r.ok ? await r.json() : true }));
    if (onderLimiet === false) {
      console.warn(JSON.stringify({ daglimiet: slug }));
      return json({ fout: "daglimiet" }, 429);
    }

    const { status, data } = await chat(inst, body);
    return json(data, status);
  } catch (e) {
    console.error(e);
    return json({ fout: "Er ging iets mis" }, 500);
  }
});
