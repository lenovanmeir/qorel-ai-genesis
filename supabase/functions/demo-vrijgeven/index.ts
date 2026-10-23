// Process plan P2 (23/10, approved by Leno + Gemini): a demo with the label "Hoge kwaliteit" (5/5 test questions and
// more than 10 treatments) for an INSTAGRAM lead is released without Leno's review. Leno still sees the link in the
// DM on his dashboard before he sends it himself. E-mail leads stay manual: releasing their demo mails the clinic.
//
// Releasing = the same n8n call as the button "Klaar – verstuur demo" (qa-demo, actie versturen), so the demo flow
// stays in one place. Called every morning by pg_cron after the night's demos are built; without a key, because it
// only does what the rule already allows.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BEHEERCODE = (Deno.env.get("BEHEERCODE") ?? "").trim();
const TELEGRAM_TOKEN = (Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "").trim();
const CHAT_ID = (Deno.env.get("TELEGRAM_CHAT_ID") ?? "423937318").trim();
const DEMO_URL = "https://qorelabs.app.n8n.cloud/webhook/qa-demo";
const DASHBOARD = "https://qoreaesthetics.com/dashboard";

type Demo = {
  id: string;
  kliniek: string;
  code: string;
  nakijk_token: string;
  email: string | null;
  leads: { contact_via: string | null; status: string } | null;
};

async function db<T>(pad: string): Promise<T> {
  const antwoord = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!antwoord.ok) throw new Error(`${pad.split("?")[0]}: ${antwoord.status} ${await antwoord.text()}`);
  return (await antwoord.json()) as T;
}

const html = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Alleen POST", { status: 405 });
  if (!BEHEERCODE) return Response.json({ fout: "BEHEERCODE ontbreekt" }, { status: 500 });
  try {
    const demos = await db<Demo[]>(
      "demo_aanvragen?select=id,kliniek,code,nakijk_token,email,leads!inner(contact_via,status)" +
        "&status=eq.te_controleren&hoge_kwaliteit=is.true&verstuurd_op=is.null&leads.contact_via=eq.Instagram-DM" +
        "&leads.status=in.(Nieuw,Opwarmen,Klaar%20om%20te%20sturen)&limit=20",
    );
    const vrij: string[] = [];
    const mislukt: string[] = [];
    for (const d of demos) {
      // Never when an address is known: n8n would mail the clinic.
      if ((d.email ?? "").includes("@") || !d.code || !d.nakijk_token) continue;
      const antwoord = await fetch(DEMO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-beheercode": BEHEERCODE },
        body: JSON.stringify({ actie: "versturen", code: d.code, nakijk: d.nakijk_token }),
      });
      const j = (await antwoord.json().catch(() => ({}))) as { ok?: boolean };
      (antwoord.ok && j.ok !== false ? vrij : mislukt).push(d.kliniek);
    }
    // Released demos are listed in the morning overview (24/10); Telegram only when a release failed.
    if (mislukt.length && TELEGRAM_TOKEN) {
      const tekst = `⚠️ <b>Demo automatisch vrijgeven niet gelukt</b>, kijk zelf na:\n${mislukt.map((k) => `• ${html(k)}`).join("\n")}` +
        `\n\n${DASHBOARD}`;
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: tekst, parse_mode: "HTML", disable_web_page_preview: true }),
      }).catch((e) => console.error("telegram", (e as Error).message));
    }
    console.log(JSON.stringify({ vrij: vrij.length, mislukt: mislukt.length }));
    return Response.json({ vrij, mislukt });
  } catch (e) {
    console.error("demo-vrijgeven", (e as Error).message);
    return Response.json({ fout: (e as Error).message }, { status: 500 });
  }
});
