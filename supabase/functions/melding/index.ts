// Sends Leno a Telegram message the moment a clinic gets warm: it used its demo (DEMO_USED) or booked a call
// (MEETING_BOOKED). Called by a database trigger with only an event id; this function checks that the event is
// a real stage change from the last hour that was not reported yet, so a stranger calling it can't send anything.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// trim(): a token pasted with a trailing newline must still work.
const TELEGRAM_TOKEN = (Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "").trim();
const CHAT_ID = (Deno.env.get("TELEGRAM_CHAT_ID") ?? "423937318").trim();
const AGENDA = "https://cal.com/leno-qore/qore-aesthetics";
const DASHBOARD = "https://qoreaesthetics.com/dashboard";

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

const html = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const kort = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

type Gebeurtenis = { id: number; lead_id: string; soort: string; data: Record<string, unknown>; op: string };
type Lead = { kliniek: string; stad: string | null; instagram: string | null; email: string | null; telefoon: string | null };

// The ready-to-send DM after a used demo, in the demo's language, built on the value equation (offers skill):
// dream outcome = every question answered even at 23:00; likelihood = they just saw it answer their own question,
// plus the go-live guarantee; time = live within 10 working days, a 15-minute call; effort = we read their site,
// they only approve. The only scarcity is real: the date their demo stops. Brand voice: calm, no exclamation marks.
function opvolgDm(kliniek: string, vraag: string, taal: string, verloopt: string | null): string {
  const onderwerp = kort(vraag.replace(/\s+/g, " ").trim(), 60);
  const datum = (locale: string) =>
    verloopt ? new Date(verloopt).toLocaleDateString(locale, { timeZone: "Europe/Brussels", day: "numeric", month: "long" }) : "";
  if (taal === "fr")
    return [
      `Bonjour, j'ai vu que vous avez testé la démo de ${kliniek} avec la question « ${onderwerp} ». C'est exactement ce que chaque patiente recevrait, même à 23h : une réponse immédiate avec vos propres informations.`,
      `La mise en place ne vous demande pas de travail : nous lisons votre site, vous validez. En ligne en 10 jours ouvrables, sinon les frais de démarrage vous sont remboursés.`,
      `On regarde ensemble en 15 minutes ce que ça donnerait pour ${kliniek} ? Choisissez un moment : ${AGENDA}` +
        (verloopt ? `\nVotre démo reste active jusqu'au ${datum("fr-BE")}.` : ""),
      "Leno",
    ].join("\n\n");
  return [
    `Hoi, ik zag dat jullie de demo van ${kliniek} testten met de vraag "${onderwerp}". Zo zou elke klant het krijgen, ook om 23u: meteen een antwoord, met jullie eigen info.`,
    `Live zetten kost jullie geen werk: wij lezen de website in, jullie keuren alleen goed. Live binnen 10 werkdagen, anders krijgen jullie de opstart terug.`,
    `Zullen we in 15 minuten bekijken hoe dat er voor ${kliniek} uitziet? Kies een moment: ${AGENDA}` +
      (verloopt ? `\nJullie demo loopt nog tot ${datum("nl-BE")}.` : ""),
    "Leno",
  ].join("\n\n");
}

async function berichtDemoGebruikt(leadId: string, lead: Lead): Promise<string> {
  const demos = await db<{ id: string; kliniek: string; taal: string | null; token: string; verloopt_op: string | null }[]>(
    `demo_aanvragen?select=id,kliniek,taal,token,verloopt_op&lead_id=eq.${leadId}&order=created_at.desc&limit=1`,
  );
  const demo = demos[0];
  const vragen = demo
    ? await db<{ inhoud: string; created_at: string }[]>(
        `demo_berichten?select=inhoud,created_at&aanvraag_id=eq.${demo.id}&rol=eq.kliniek&order=created_at.asc&limit=5`,
      )
    : [];
  const lijst = vragen.length
    ? vragen.map((v) => `• ${html(kort(v.inhoud, 140))}`).join("\n")
    : "• (de vraag zelf is nog niet geladen)";
  const verloopt = demo?.verloopt_op && Date.parse(demo.verloopt_op) > Date.now() ? demo.verloopt_op : null;
  // The demo request holds the clean name ("Nōré"); the lead often has an Instagram-style one ("nore.clinic | ...").
  const naam = demo?.kliniek?.trim() || lead.kliniek.split(" | ")[0];
  const dm = opvolgDm(naam, vragen[0]?.inhoud ?? "jullie behandelingen", demo?.taal ?? "nl", verloopt);
  return [
    `🔥 <b>${html(lead.kliniek)} gebruikt nu haar demo</b>`,
    [lead.stad, lead.instagram].filter(Boolean).map(html).join(" · "),
    "",
    "<b>Gevraagd:</b>",
    lijst,
    "",
    "<b>Stuur nu (kopieer):</b>",
    `<code>${html(dm)}</code>`,
    "",
    `Later meer vragen? Die staan in de tab Demo's: ${DASHBOARD}`,
  ].join("\n");
}

async function berichtGesprekGeboekt(leadId: string, lead: Lead): Promise<string> {
  const calls = await db<{ data: Record<string, string> }[]>(
    `lead_gebeurtenissen?select=data&lead_id=eq.${leadId}&soort=eq.call&order=id.desc&limit=1`,
  );
  const c = calls[0]?.data ?? {};
  const start = c.start
    ? new Date(c.start).toLocaleString("nl-BE", { timeZone: "Europe/Brussels", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : "";
  return [
    `📅 <b>Gesprek geboekt: ${html(lead.kliniek)}</b>`,
    start ? `${html(start)} (Belgische tijd)` : "",
    [c.naam, c.email || lead.email, lead.instagram].filter(Boolean).map(html).join(" · "),
    "",
    `Voorbereiden: kijk in de Funnel-tab wat ze in hun demo vroegen. ${DASHBOARD}`,
  ].filter((r) => r !== "").join("\n");
}

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  if (req.method !== "POST") return json({ fout: "Alleen POST" }, 405);

  try {
    const { gebeurtenis } = await req.json();
    if (!Number.isInteger(gebeurtenis)) return json({ fout: "Geen geldige gebeurtenis" }, 400);

    const [g] = await db<Gebeurtenis[]>(`lead_gebeurtenissen?select=id,lead_id,soort,data,op&id=eq.${gebeurtenis}`);
    const naar = String(g?.data?.naar ?? "");
    const vers = g && Date.now() - Date.parse(g.op) < 3600_000;
    if (!g || g.soort !== "fase" || !["DEMO_USED", "MEETING_BOOKED"].includes(naar) || !vers)
      return json({ ok: true, gemeld: false });

    // Claim the event first: only the call that flips "gemeld" from empty sends the message, so a retry never doubles it.
    const geclaimd = await db<unknown[]>(`lead_gebeurtenissen?id=eq.${g.id}&data->>gemeld=is.null`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ data: { ...g.data, gemeld: new Date().toISOString() } }),
    });
    if (!geclaimd.length) return json({ ok: true, gemeld: false, al: true });

    const [lead] = await db<Lead[]>(`leads?select=kliniek,stad,instagram,email,telefoon&id=eq.${g.lead_id}`);
    if (!lead) return json({ ok: true, gemeld: false });

    // The demo question (or, for a new Cal.com lead, the booking details) is stored a moment after the stage
    // changes; give it a second to land.
    await new Promise((r) => setTimeout(r, 1500));
    const tekst = naar === "DEMO_USED" ? await berichtDemoGebruikt(g.lead_id, lead) : await berichtGesprekGeboekt(g.lead_id, lead);

    if (!TELEGRAM_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN ontbreekt");
    const tg = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: tekst, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!tg.ok) throw new Error(`Telegram: ${tg.status} ${await tg.text()}`);
    return json({ ok: true, gemeld: true });
  } catch (e) {
    console.error(e);
    return json({ fout: "Melding mislukt" }, 500);
  }
});
