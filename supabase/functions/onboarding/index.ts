// Step 4: payment -> onboarding. When a clinic pays the monthly subscription (Stripe Payment Link) or Leno adds a
// client by hand on /beheer, this function sets everything up in one go:
//   clinic (slug = intake code, so the intake converter later fills this same clinic), its own runtime login for the
//   chatbot (table kliniek_runtime, used by the Edge Function "kliniek-login"), its website widget (off until go-live),
//   an intake pre-filled from its website, and a Telegram message to Leno.
// The welcome mail with the intake link goes out only when Leno presses the button on /beheer, after a look.
//
// POST with stripe-signature          Stripe webhook, checked with STRIPE_WEBHOOK_SECRET:
//   checkout.session.completed               new client (card: paid at once; SEPA: waits for the bank)
//   checkout.session.async_payment_succeeded the bank confirmed the first SEPA payment
//   checkout.session.async_payment_failed    the first SEPA payment failed
//   invoice.paid / invoice.payment_failed    every monthly payment, written to table betalingen
//   customer.subscription.updated / deleted  the client cancels, or the subscription ended
//   The chatbot only works while betaalstatus allows it (checked by the Edge Function "kliniek-login").
// POST {controle: true}               the hourly database job: stops clients that are 5 days late (no key needed,
//                                     it only acts on what the database already says)
// With x-beheercode (the /beheer page):
// GET                                 the onboardings with their checklist
// POST {handmatig: {...}}             add a client by hand (setup fee by invoice, no Stripe yet, or a test)
// POST {opstart: {id, betaald}}       Leno ticks that the setup fee landed on Wise
// POST {welkomstmail: {id, versturen}} preview (versturen false) or send the welcome mail

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BEHEERCODE = Deno.env.get("BEHEERCODE") ?? "";
const STRIPE_GEHEIM = (Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "").trim();
const TELEGRAM_TOKEN = (Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "").trim();
const CHAT_ID = (Deno.env.get("TELEGRAM_CHAT_ID") ?? "423937318").trim();

const VOORBEREIDEN_URL = "https://qorelabs.app.n8n.cloud/webhook/qore-intake-voorbereiden";
const INTAKE_URL = "https://qorelabs.app.n8n.cloud/webhook/qore-intake";
const MAIL_URL = "https://qorelabs.app.n8n.cloud/webhook/qore-onboarding-mail";
const SITE = "https://qoreaesthetics.com";

const TOEGESTAAN = new Set([
  "https://qoreaesthetics.com",
  "https://www.qoreaesthetics.com",
  "http://localhost:8080",
  "http://aesthetics.localhost:8080",
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Taal = "nl" | "fr" | "en";

type Onboarding = {
  id: string;
  bron: string;
  pakket: string | null;
  contract: string | null;
  kliniek_naam: string;
  website: string | null;
  email: string | null;
  taal: Taal;
  clinic_id: string | null;
  intake_code: string | null;
  opstart_betaald_op: string | null;
  welkomstmail_op: string | null;
  fout: string | null;
  aangemaakt_op: string;
  stripe_abonnement: string | null;
  betaalstatus: Betaalstatus | null;
  betaalprobleem_sinds: string | null;
  opzegging_op: string | null;
};

type Betaalstatus = "wacht_op_betaling" | "actief" | "betaalprobleem" | "gestopt" | "opgezegd";

// Days a client keeps the chatbot after a failed monthly payment (Leno, 22/10). Keep in sync with kliniek-login.
const GRATIE_DAGEN = 5;

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

async function telegram(tekst: string) {
  if (!TELEGRAM_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: tekst, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch((e) => console.error("telegram", e));
}

// Same code shape as /beheer makes for a new intake: name + 5 random characters.
function maakCode(naam: string) {
  const kern = naam.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  const letters = "abcdefghijkmnpqrstuvwxyz23456789";
  const willekeurig = crypto.getRandomValues(new Uint8Array(5));
  return `${kern || "kliniek"}-${[...willekeurig].map((b) => letters[b % letters.length]).join("")}`;
}

const domeinVan = (url: string | null) => {
  try {
    return url ? new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};

const intakeLink = (code: string, taal: Taal) => `${SITE}/intake/${code}${taal === "nl" ? "" : `?taal=${taal}`}`;

// ---------- Stripe ----------

async function hmacHex(geheim: string, tekst: string): Promise<string> {
  const sleutel = await crypto.subtle.importKey("raw", new TextEncoder().encode(geheim), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", sleutel, new TextEncoder().encode(tekst)));
  return [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Stripe-Signature: t=<time>,v1=<hmac of "t.body">; at most 5 minutes old.
async function stripeKlopt(ruw: string, kop: string): Promise<boolean> {
  if (!STRIPE_GEHEIM) return false;
  const delen = Object.fromEntries(kop.split(",").map((d) => d.split("=") as [string, string]));
  const t = Number(delen.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const verwacht = await hmacHex(STRIPE_GEHEIM, `${t}.${ruw}`);
  return kop.split(",").some((d) => d.startsWith("v1=") && gelijk(d.slice(3), verwacht));
}

// Monthly amounts in cents (without the optional €250 extra language) -> package and contract.
const BEDRAGEN: Record<number, { pakket: string; contract: "maand" | "jaar" }> = {
  23900: { pakket: "Start", contract: "maand" },
  19900: { pakket: "Start", contract: "jaar" },
  41900: { pakket: "Groei", contract: "maand" },
  34900: { pakket: "Groei", contract: "jaar" },
  65900: { pakket: "Compleet", contract: "maand" },
  54900: { pakket: "Compleet", contract: "jaar" },
};

type StripeSessie = {
  id: string;
  mode?: string;
  customer?: string | null;
  subscription?: string | null;
  amount_subtotal?: number | null;
  // "paid" (card), "no_payment_required" (100% discount) or "unpaid" (SEPA: the bank confirms days later).
  payment_status?: string | null;
  locale?: string | null;
  customer_details?: { email?: string | null; name?: string | null; business_name?: string | null } | null;
  custom_fields?: { key: string; text?: { value?: string | null } | null }[];
};

function uitStripe(s: StripeSessie) {
  const veld = (...sleutels: string[]) =>
    (s.custom_fields ?? []).find((f) => sleutels.includes(f.key.toLowerCase()))?.text?.value?.trim() || "";
  const bedrag = s.amount_subtotal ?? 0;
  const pakket = BEDRAGEN[bedrag] ?? BEDRAGEN[bedrag - 25000] ?? null;
  const taal = String(s.locale ?? "").slice(0, 2);
  return {
    stripe_sessie: s.id,
    stripe_klant: s.customer ?? null,
    stripe_abonnement: s.subscription ?? null,
    pakket: pakket?.pakket ?? null,
    contract: pakket?.contract ?? null,
    kliniek_naam:
      veld("kliniek", "naamkliniek", "kliniek_naam", "clinic", "clinicname") ||
      s.customer_details?.business_name ||
      s.customer_details?.name ||
      "Nieuwe kliniek",
    website: veld("website", "site") || null,
    email: s.customer_details?.email ?? null,
    taal: (["nl", "fr", "en"].includes(taal) ? taal : "nl") as Taal,
    betaalstatus: (s.payment_status === "unpaid" ? "wacht_op_betaling" : "actief") as Betaalstatus,
  };
}

type StripeFactuur = {
  id: string;
  amount_paid?: number;
  amount_due?: number;
  currency?: string;
  subscription?: string | null;
  parent?: { subscription_details?: { subscription?: string | null } | null } | null;
  lines?: { data?: { period?: { start?: number; end?: number } }[] };
};

type StripeAbonnement = {
  id: string;
  cancel_at_period_end?: boolean;
  cancel_at?: number | null;
  current_period_end?: number;
  items?: { data?: { current_period_end?: number }[] };
};

const ABONNEMENT = /^sub_[A-Za-z0-9]+$/;
const isoVan = (unix?: number | null) => (unix ? new Date(unix * 1000).toISOString() : null);
const dag = (iso: string) => new Date(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "long", timeZone: "Europe/Brussels" });

async function klantVanAbonnement(abonnement: string | null | undefined): Promise<Onboarding | null> {
  if (!abonnement || !ABONNEMENT.test(abonnement)) return null;
  const [o] = await db<Onboarding[]>(`onboardingen?stripe_abonnement=eq.${abonnement}&select=*&limit=1`);
  return o ?? null;
}

const bijwerken = (id: string, velden: Partial<Onboarding>) =>
  db(`onboardingen?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(velden) });

// One row per Stripe invoice; a failed invoice that is paid later turns into "betaald", never the other way round
// (Stripe does not promise the order of its events).
async function betalingBewaren(f: StripeFactuur, status: "betaald" | "mislukt") {
  const periode = f.lines?.data?.[0]?.period;
  await db("betalingen?on_conflict=stripe_factuur", {
    method: "POST",
    headers: { Prefer: status === "betaald" ? "resolution=merge-duplicates" : "resolution=ignore-duplicates" },
    body: JSON.stringify({
      stripe_factuur: f.id,
      stripe_abonnement: f.parent?.subscription_details?.subscription ?? f.subscription ?? null,
      soort: "abonnement",
      bron: "stripe",
      status,
      bedrag_cent: (status === "betaald" ? f.amount_paid : f.amount_due) ?? 0,
      valuta: f.currency ?? "eur",
      periode_van: isoVan(periode?.start),
      periode_tot: isoVan(periode?.end),
      datum: new Date().toISOString(),
    }),
  });
}

async function stripeEvent(event: { type?: string; data?: { object?: unknown } }) {
  const object = event.data?.object;
  switch (event.type) {
    case "checkout.session.completed": {
      const sessie = object as StripeSessie;
      if (sessie?.mode !== "subscription") return;
      await onboarden({ bron: "stripe", ...uitStripe(sessie) });
      return;
    }
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      const sessie = object as StripeSessie;
      if (!/^cs_[A-Za-z0-9_]+$/.test(sessie?.id ?? "")) return;
      const [o] = await db<Onboarding[]>(`onboardingen?stripe_sessie=eq.${sessie.id}&select=*`);
      if (!o) return;
      const gelukt = event.type.endsWith("succeeded");
      if (gelukt && o.betaalstatus === "actief") return; // invoice.paid was first and already said so
      await bijwerken(o.id, { betaalstatus: gelukt ? "actief" : "gestopt", betaalprobleem_sinds: null });
      await telegram(
        gelukt
          ? `✅ <b>${html(o.kliniek_naam)}</b>: de bank bevestigde de eerste betaling. De chatbot mag werken.`
          : `⛔ <b>${html(o.kliniek_naam)}</b>: de eerste SEPA-betaling is mislukt. De chatbot blijft uit.\nNeem contact op: ${html(o.email ?? "geen e-mail")}`,
      );
      return;
    }
    case "invoice.paid": {
      const factuur = object as StripeFactuur;
      await betalingBewaren(factuur, "betaald");
      const o = await klantVanAbonnement(factuur.parent?.subscription_details?.subscription ?? factuur.subscription);
      if (!o || o.betaalstatus === "actief" || o.betaalstatus === "opgezegd") return;
      const was = o.betaalstatus;
      await bijwerken(o.id, { betaalstatus: "actief", betaalprobleem_sinds: null });
      await telegram(
        was === "wacht_op_betaling"
          ? `✅ <b>${html(o.kliniek_naam)}</b>: de bank bevestigde de eerste betaling. De chatbot mag werken.`
          : `✅ <b>${html(o.kliniek_naam)}</b> heeft alsnog betaald. ${was === "gestopt" ? "De chatbot werkt weer." : "Het betaalprobleem is opgelost."}`,
      );
      return;
    }
    case "invoice.payment_failed": {
      const factuur = object as StripeFactuur;
      await betalingBewaren(factuur, "mislukt");
      const o = await klantVanAbonnement(factuur.parent?.subscription_details?.subscription ?? factuur.subscription);
      // Only the first failure starts the 5 days; Stripe's retries that fail again change nothing.
      if (!o || o.betaalstatus !== "actief") return;
      const sinds = new Date().toISOString();
      await bijwerken(o.id, { betaalstatus: "betaalprobleem", betaalprobleem_sinds: sinds });
      const stop = new Date(Date.parse(sinds) + GRATIE_DAGEN * 86_400_000).toISOString();
      await telegram(
        [
          `⚠️ <b>${html(o.kliniek_naam)}</b>: maandbetaling mislukt (€${((factuur.amount_due ?? 0) / 100).toFixed(2)}).`,
          "Stripe probeert opnieuw en mailt de klant.",
          `Is er niet betaald, dan stopt de chatbot op ${dag(stop)}.`,
          o.email ? `✉️ ${html(o.email)}` : "",
        ].filter(Boolean).join("\n"),
      );
      return;
    }
    case "customer.subscription.updated": {
      const a = object as StripeAbonnement;
      const o = await klantVanAbonnement(a.id);
      if (!o) return;
      const einde = a.cancel_at ?? (a.cancel_at_period_end ? (a.items?.data?.[0]?.current_period_end ?? a.current_period_end) : null);
      if (einde && !o.opzegging_op) {
        const op = isoVan(einde)!;
        await bijwerken(o.id, { opzegging_op: op });
        await telegram(`📭 <b>${html(o.kliniek_naam)}</b> zegt op. Het abonnement en de chatbot stoppen op ${dag(op)}.`);
      } else if (!einde && o.opzegging_op && o.betaalstatus !== "opgezegd") {
        await bijwerken(o.id, { opzegging_op: null });
        await telegram(`↩️ <b>${html(o.kliniek_naam)}</b> heeft de opzegging ingetrokken. Het abonnement loopt door.`);
      }
      return;
    }
    case "customer.subscription.deleted": {
      const a = object as StripeAbonnement;
      const o = await klantVanAbonnement(a.id);
      if (!o || o.betaalstatus === "opgezegd") return;
      await bijwerken(o.id, { betaalstatus: "opgezegd", opzegging_op: o.opzegging_op ?? new Date().toISOString() });
      await telegram(`⛔ <b>${html(o.kliniek_naam)}</b>: het abonnement is beëindigd. De chatbot staat uit.`);
      return;
    }
  }
}

// Clients whose monthly payment failed more than GRATIE_DAGEN ago. The PATCH only returns the rows it changed,
// so each client gets exactly one message even when the job runs twice.
async function controle() {
  const grens = new Date(Date.now() - GRATIE_DAGEN * 86_400_000).toISOString();
  const gestopt = await db<Onboarding[]>(`onboardingen?betaalstatus=eq.betaalprobleem&betaalprobleem_sinds=lt.${grens}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ betaalstatus: "gestopt" }),
  });
  for (const o of gestopt) {
    await telegram(
      `⛔ <b>${html(o.kliniek_naam)}</b>: na ${GRATIE_DAGEN} dagen nog niet betaald. De chatbot staat uit tot er betaald is.${o.email ? `\n✉️ ${html(o.email)}` : ""}`,
    );
  }
  return { gestopt: gestopt.length };
}

// ---------- the onboarding itself ----------

type Nieuw = {
  bron: "stripe" | "handmatig";
  stripe_sessie?: string | null;
  stripe_klant?: string | null;
  stripe_abonnement?: string | null;
  pakket: string | null;
  contract: string | null;
  kliniek_naam: string;
  website: string | null;
  email: string | null;
  taal: Taal;
  betaalstatus?: Betaalstatus;
};

// Creates the onboarding row first (Stripe may send the same event twice: the unique session stops the second),
// then every step; a failing step is written to "fout" so /beheer shows it.
async function onboarden(n: Nieuw): Promise<Onboarding | null> {
  const [rij] = await db<Onboarding[]>("onboardingen?on_conflict=stripe_sessie", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify(n),
  });
  if (!rij) return null; // already handled

  const code = maakCode(n.kliniek_naam);
  const stappen: string[] = [];
  try {
    const [kliniek] = await db<{ id: string }[]>("clinics", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name: n.kliniek_naam, slug: code, website_url: n.website, timezone: "Europe/Brussels", is_active: true, is_klant: true }),
    });
    await db(`onboardingen?id=eq.${rij.id}`, { method: "PATCH", body: JSON.stringify({ clinic_id: kliniek.id, intake_code: code }) });
    stappen.push("kliniek");

    // Its own login for the chatbot. The password is random and thrown away: kliniek-login never needs it.
    const wachtwoord = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
    const email = `runtime+${code}@qorelabs.io`;
    const gebruiker = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: wachtwoord,
        email_confirm: true,
        app_metadata: { clinic_id: kliniek.id, qore_role: "chat_runtime" },
      }),
    });
    const g = await gebruiker.json().catch(() => ({}));
    if (!gebruiker.ok || !g?.id) throw new Error(`login aanmaken (${gebruiker.status})`);
    await db("kliniek_runtime", { method: "POST", body: JSON.stringify({ clinic_id: kliniek.id, user_id: g.id, email }) });
    stappen.push("login");

    // Widget ready but off: Leno switches it on at go-live, so visitors never meet an empty receptionist.
    const domein = domeinVan(n.website);
    await db("widget_instellingen", {
      method: "POST",
      body: JSON.stringify({ clinic_id: kliniek.id, weergavenaam: n.kliniek_naam, domeinen: domein ? [domein] : [], is_actief: false }),
    });
    stappen.push("widget");

    // Intake: pre-filled from the website by AI (about a minute), otherwise an empty form.
    const metAi = !!n.website;
    const intake = await fetch(metAi ? VOORBEREIDEN_URL : INTAKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-beheercode": BEHEERCODE },
      body: JSON.stringify(
        metAi
          ? { code, naam: n.kliniek_naam, website: n.website, taal: n.taal }
          : { code, naam: n.kliniek_naam, website: "", status: "concept" },
      ),
    });
    if (!intake.ok) throw new Error(`intake ${metAi ? "voorbereiden" : "aanmaken"} (${intake.status})`);
    stappen.push(metAi ? "intake (voorbereid)" : "intake (leeg)");
  } catch (e) {
    const fout = `Gestopt na: ${stappen.join(", ") || "niets"}. ${e instanceof Error ? e.message : e}`;
    console.error(fout);
    await db(`onboardingen?id=eq.${rij.id}`, { method: "PATCH", body: JSON.stringify({ fout }) }).catch(() => {});
  }

  const [nu] = await db<Onboarding[]>(`onboardingen?id=eq.${rij.id}&select=*`);
  await telegram(
    [
      `🎉 <b>Nieuwe klant: ${html(n.kliniek_naam)}</b>`,
      [n.pakket, n.contract && (n.contract === "jaar" ? "jaarcontract" : "maandelijks")].filter(Boolean).join(" · ") || (n.bron === "handmatig" ? "handmatig toegevoegd" : ""),
      n.email ? `✉️ ${html(n.email)}` : "",
      n.betaalstatus === "wacht_op_betaling" ? "⏳ Betaald met SEPA: de chatbot werkt pas als de bank bevestigt (enkele werkdagen)." : "",
      nu?.fout ? `⚠️ ${html(nu.fout)}` : "✅ Kliniek, login, widget en intake staan klaar.",
      `Kijk de intake na en verstuur de welkomstmail: ${SITE}/beheer`,
    ].filter(Boolean).join("\n"),
  );
  return nu ?? null;
}

// ---------- welcome mail ----------

const MAIL: Record<Taal, (o: Onboarding, link: string) => { onderwerp: string; tekst: string }> = {
  nl: (o, link) => ({
    onderwerp: `Welkom bij Qore Aesthetics: de volgende stap voor ${o.kliniek_naam}`,
    tekst: [
      "Beste,",
      "",
      `Bedankt voor uw vertrouwen. We starten met de AI-receptioniste van ${o.kliniek_naam}.`,
      "",
      "Eén ding hebben we nu van u nodig: de vragenlijst hieronder. We hebben hem al zo ver mogelijk ingevuld met de informatie van uw website, dus u kijkt vooral na en vult aan. Dat duurt ongeveer 30 minuten, en u kunt tussendoor stoppen.",
      "",
      `Uw vragenlijst: ${link}`,
      "",
      "Daarna:",
      "1. Wij bouwen uw receptioniste en u test haar zelf.",
      "2. We zetten haar op uw website (één regel code, wij helpen) en, als u dat koos, op Instagram en Facebook.",
      "3. Ze staat live binnen 4 werkdagen nadat de vragenlijst, de opstartbetaling en de toegang tot uw kanalen binnen zijn.",
      "",
      "Weet u iets niet zeker, laat het dan open. De AI verzint nooit iets.",
      "",
      "Met vriendelijke groet,",
      "Leno",
      "Qore Aesthetics",
    ].join("\n"),
  }),
  fr: (o, link) => ({
    onderwerp: `Bienvenue chez Qore Aesthetics : la prochaine étape pour ${o.kliniek_naam}`,
    tekst: [
      "Bonjour,",
      "",
      `Merci pour votre confiance. Nous démarrons la réceptionniste IA de ${o.kliniek_naam}.`,
      "",
      "Nous avons besoin d'une seule chose : le questionnaire ci-dessous. Nous l'avons déjà pré-rempli autant que possible avec les informations de votre site, il vous suffit surtout de vérifier et de compléter. Comptez environ 30 minutes ; vous pouvez vous arrêter à tout moment.",
      "",
      `Votre questionnaire : ${link}`,
      "",
      "Ensuite :",
      "1. Nous construisons votre réceptionniste et vous la testez vous-même.",
      "2. Nous la plaçons sur votre site (une ligne de code, nous vous aidons) et, si vous l'avez choisi, sur Instagram et Facebook.",
      "3. Elle est en ligne dans les 4 jours ouvrables après réception du questionnaire, du paiement de démarrage et de l'accès à vos canaux.",
      "",
      "En cas de doute, laissez le champ vide. L'IA n'invente jamais rien.",
      "",
      "Bien cordialement,",
      "Leno",
      "Qore Aesthetics",
    ].join("\n"),
  }),
  en: (o, link) => ({
    onderwerp: `Welcome to Qore Aesthetics: the next step for ${o.kliniek_naam}`,
    tekst: [
      "Hello,",
      "",
      `Thank you for your trust. We're starting on the AI receptionist for ${o.kliniek_naam}.`,
      "",
      "We need one thing from you now: the questionnaire below. We've already filled in as much as we could from your website, so you mostly check and complete it. It takes about 30 minutes, and you can stop and come back at any time.",
      "",
      `Your questionnaire: ${link}`,
      "",
      "Then:",
      "1. We build your receptionist and you test it yourself.",
      "2. We put it on your website (one line of code, we help) and, if you chose it, on Instagram and Facebook.",
      "3. It goes live within 4 working days once the questionnaire, the setup payment and access to your channels are in.",
      "",
      "If you're unsure about something, leave it empty. The AI never makes anything up.",
      "",
      "Kind regards,",
      "Leno",
      "Qore Aesthetics",
    ].join("\n"),
  }),
};

async function welkomstmail(id: string, versturen: boolean) {
  const [o] = await db<Onboarding[]>(`onboardingen?id=eq.${id}&select=*`);
  if (!o) throw new Error("Onbekende klant");
  if (!o.intake_code) throw new Error("Er is nog geen intake voor deze klant");
  const mail = MAIL[o.taal](o, intakeLink(o.intake_code, o.taal));
  if (!versturen) return { aan: o.email, ...mail };
  if (!o.email) throw new Error("Er staat geen e-mailadres bij deze klant");
  const antwoord = await fetch(MAIL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-beheercode": BEHEERCODE },
    body: JSON.stringify({ aan: o.email, onderwerp: mail.onderwerp, tekst: mail.tekst }),
  });
  if (!antwoord.ok) throw new Error(`Mail versturen lukte niet (${antwoord.status})`);
  await db(`onboardingen?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ welkomstmail_op: new Date().toISOString() }) });
  // The intake moves from "concept" to "verstuurd", as when Leno copies the link by hand.
  await db(`intakes?code=eq.${o.intake_code}&status=eq.concept`, { method: "PATCH", body: JSON.stringify({ status: "verstuurd" }) }).catch(
    (e) => console.error("intake status", e),
  );
  return { verstuurd: true, aan: o.email };
}

// ---------- /beheer list ----------

async function lijst() {
  const rijen = await db<Onboarding[]>("onboardingen?select=*&order=aangemaakt_op.desc&limit=50");
  const codes = rijen.map((r) => r.intake_code).filter(Boolean);
  const ids = rijen.map((r) => r.clinic_id).filter(Boolean);
  const abonnementen = rijen.map((r) => r.stripe_abonnement).filter((a): a is string => !!a && ABONNEMENT.test(a));
  const filters = [
    abonnementen.length ? `stripe_abonnement.in.(${abonnementen.join(",")})` : "",
    rijen.length ? `onboarding_id.in.(${rijen.map((r) => r.id).join(",")})` : "",
  ].filter(Boolean);
  const [intakes, widgets, kanalen, betalingen] = await Promise.all([
    codes.length ? db<{ code: string; status: string }[]>(`intakes?select=code,status&code=in.(${codes.join(",")})`).catch(() => []) : [],
    ids.length ? db<{ clinic_id: string; is_actief: boolean }[]>(`widget_instellingen?select=clinic_id,is_actief&clinic_id=in.(${ids.join(",")})`) : [],
    ids.length ? db<{ clinic_id: string; channel: string; is_enabled: boolean }[]>(`clinic_channels?select=clinic_id,channel,is_enabled&clinic_id=in.(${ids.join(",")})`) : [],
    filters.length
      ? db<{ stripe_abonnement: string | null; onboarding_id: string | null }[]>(
          `betalingen?select=*&or=(${filters.join(",")})&order=datum.desc&limit=500`,
        )
      : [],
  ]);
  return rijen.map((r) => ({
    ...r,
    betalingen: betalingen.filter(
      (b) => b.onboarding_id === r.id || (!!r.stripe_abonnement && b.stripe_abonnement === r.stripe_abonnement),
    ),
    // The day the chatbot stops when the failed payment stays unpaid.
    stopt_op: r.betaalstatus === "betaalprobleem" && r.betaalprobleem_sinds
      ? new Date(Date.parse(r.betaalprobleem_sinds) + GRATIE_DAGEN * 86_400_000).toISOString()
      : null,
    intake_status: intakes.find((i) => i.code === r.intake_code)?.status ?? null,
    widget_aan: widgets.find((w) => w.clinic_id === r.clinic_id)?.is_actief ?? null,
    kanalen: kanalen.filter((k) => k.clinic_id === r.clinic_id && k.is_enabled).map((k) => k.channel),
    intake_link: r.intake_code ? intakeLink(r.intake_code, r.taal) : null,
  }));
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": TOEGESTAAN.has(origin) ? origin : "https://qoreaesthetics.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-beheercode",
    Vary: "Origin",
  };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  // Stripe
  const handtekening = req.headers.get("stripe-signature");
  if (handtekening !== null) {
    const ruw = await req.text();
    if (!(await stripeKlopt(ruw, handtekening))) {
      console.warn(JSON.stringify({ stripe: "handtekening klopt niet", geheim_gezet: !!STRIPE_GEHEIM }));
      return json({ fout: "Handtekening klopt niet" }, 400);
    }
    const event = JSON.parse(ruw);
    // Stripe wants an answer within seconds; preparing the intake takes about a minute.
    // @ts-ignore EdgeRuntime exists in Supabase Edge Functions
    EdgeRuntime.waitUntil(stripeEvent(event).catch((e) => console.error(event?.type, e)));
    return json({ ontvangen: event?.type ?? null });
  }

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  if (body?.controle === true) {
    try {
      return json(await controle());
    } catch (e) {
      console.error("controle", e);
      return json({ fout: "controle mislukt" }, 500);
    }
  }

  if (!BEHEERCODE || !gelijk(req.headers.get("x-beheercode") ?? "", BEHEERCODE)) return json({ fout: "Beheercode klopt niet" }, 403);
  try {
    if (req.method === "GET") return json({ klanten: await lijst() });

    if (body?.handmatig) {
      const h = body.handmatig;
      const naam = String(h.kliniek_naam ?? "").trim().slice(0, 120);
      if (!naam) return json({ fout: "Naam van de kliniek ontbreekt" }, 400);
      const email = String(h.email ?? "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ fout: "E-mailadres klopt niet" }, 400);
      const taal = ["nl", "fr", "en"].includes(h.taal) ? h.taal : "nl";
      const nu = await onboarden({
        bron: "handmatig",
        pakket: ["Start", "Groei", "Compleet"].includes(h.pakket) ? h.pakket : null,
        contract: h.contract === "jaar" ? "jaar" : h.contract === "maand" ? "maand" : null,
        kliniek_naam: naam,
        website: String(h.website ?? "").trim().slice(0, 300) || null,
        email: email || null,
        taal,
      });
      return json({ ok: true, klant: nu });
    }
    if (body?.opstart) {
      if (!UUID.test(String(body.opstart.id))) return json({ fout: "Onbekende klant" }, 400);
      await db(`onboardingen?id=eq.${body.opstart.id}`, {
        method: "PATCH",
        body: JSON.stringify({ opstart_betaald_op: body.opstart.betaald ? new Date().toISOString() : null }),
      });
      return json({ ok: true });
    }
    if (body?.welkomstmail) {
      if (!UUID.test(String(body.welkomstmail.id))) return json({ fout: "Onbekende klant" }, 400);
      return json(await welkomstmail(body.welkomstmail.id, body.welkomstmail.versturen === true));
    }
    return json({ fout: "Onbekende actie" }, 400);
  } catch (e) {
    console.error(e);
    return json({ fout: e instanceof Error ? e.message : "Mislukt" }, 500);
  }
});
