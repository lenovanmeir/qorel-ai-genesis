// Cal.com calls this when someone books, reschedules, cancels or finishes a call with Leno.
// It finds the clinic's lead (demo token from the demo page, else Instagram handle, e-mail, website domain or exact clinic name), moves its funnel
// stage (fase) and logs the call on the lead's timeline. A booking from an unknown clinic becomes a new lead.
// Every Cal.com delivery is stored once (extern_id), so a retried webhook changes nothing twice.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// trim(): a secret pasted with a trailing newline (e.g. from `openssl rand | pbcopy`) must still match Cal.com's single-line field.
const GEHEIM = (Deno.env.get("CALCOM_WEBHOOK_SECRET") ?? "").trim();

const db = (pad: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      "x-qore-bron": "calcom", // shows up as bron on the stage-change events
      ...(init.headers ?? {}),
    },
  });

async function dbJson<T>(pad: string, init: RequestInit = {}): Promise<T> {
  const antwoord = await db(pad, init);
  if (!antwoord.ok) throw new Error(`${pad.split("?")[0]}: ${antwoord.status} ${await antwoord.text()}`);
  const tekst = await antwoord.text();
  return (tekst ? JSON.parse(tekst) : null) as T;
}

async function handtekeningKlopt(ruw: string, handtekening: string): Promise<boolean> {
  if (!GEHEIM || !handtekening) return false;
  const sleutel = await crypto.subtle.importKey("raw", new TextEncoder().encode(GEHEIM), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", sleutel, new TextEncoder().encode(ruw)));
  const verwacht = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  // Constant-time compare.
  let verschil = verwacht.length ^ handtekening.length;
  for (let i = 0; i < verwacht.length; i++) verschil |= verwacht.charCodeAt(i) ^ (handtekening.charCodeAt(i) || 0);
  return verschil === 0;
}

// Cal.com sends booking-form answers either as {label, value} or as the bare value.
// deno-lint-ignore no-explicit-any
const antwoord = (r: any, sleutel: string): string => {
  const v = r?.[sleutel];
  const w = v && typeof v === "object" && "value" in v ? v.value : v;
  return typeof w === "string" ? w.trim() : "";
};

// Which stage each Cal.com event moves the lead to.
const FASE: Record<string, string> = {
  BOOKING_CREATED: "MEETING_BOOKED",
  BOOKING_RESCHEDULED: "MEETING_BOOKED",
  MEETING_ENDED: "MEETING_HELD",
};

async function zoekLead(kliniek: string, websiteOfIg: string, email: string): Promise<string | null> {
  const lijktIg = /instagram\.com|^@/i.test(websiteOfIg) || (!!websiteOfIg && !websiteOfIg.includes("."));
  const id = await dbJson<string | null>("rpc/lead_zoeken", {
    method: "POST",
    body: JSON.stringify({
      p_instagram: lijktIg ? websiteOfIg : null,
      p_website: lijktIg ? null : websiteOfIg || null,
      p_email: email || null,
    }),
  });
  if (id) return id;
  if (!kliniek) return null;
  // Last resort: exactly one lead with this clinic name.
  const naam = encodeURIComponent(kliniek.replace(/[*,()]/g, " ").trim());
  const rijen = await dbJson<{ id: string }[]>(`leads?select=id&kliniek=ilike.${naam}&limit=2`);
  return rijen.length === 1 ? rijen[0].id : null;
}

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  if (req.method !== "POST") return json({ fout: "Alleen POST" }, 405);

  const ruw = await req.text();
  const handtekening = req.headers.get("x-cal-signature-256") ?? "";
  if (!(await handtekeningKlopt(ruw, handtekening))) {
    // Cal.com's "Ping test" button sends no signature. Answer it with OK but touch nothing,
    // so the setup screen shows the URL is reachable; every real booking event must be signed.
    let soort = "";
    try {
      soort = JSON.parse(ruw)?.triggerEvent ?? "";
    } catch { /* not JSON */ }
    if (soort === "PING" && !handtekening) return json({ ok: true, ping: true, ondertekend: false });
    console.warn(handtekening ? "Handtekening klopt niet (ander geheim?)" : "Handtekening ontbreekt", soort);
    return json({ fout: "Handtekening klopt niet" }, 401);
  }

  try {
    const bericht = JSON.parse(ruw);
    const soort: string = bericht.triggerEvent ?? "";
    const p = bericht.payload ?? {};
    // Cal.com's "Test webhook" ping has no booking; answer OK so the setup screen shows success.
    if (!p.uid) return json({ ok: true, test: true });

    const deelnemer = (p.attendees ?? [])[0] ?? {};
    const r = p.responses ?? {};
    const email = (antwoord(r, "email") || deelnemer.email || "").toLowerCase();
    const naam = antwoord(r, "name") || deelnemer.name || "";
    const kliniek = antwoord(r, "kliniek");
    const websiteOfIg = antwoord(r, "website");

    // Booked from a demo page: the link carries metadata[demo]=<token>, which points at exactly one lead.
    const demoToken = typeof p.metadata?.demo === "string" ? p.metadata.demo : "";
    let leadId: string | null = null;
    if (/^[0-9a-f]{32}$/.test(demoToken)) {
      const [demo] = await dbJson<{ lead_id: string | null }[]>(`demo_aanvragen?select=lead_id&token=eq.${demoToken}&limit=1`);
      leadId = demo?.lead_id ?? null;
    }
    if (!leadId) leadId = await zoekLead(kliniek, websiteOfIg, email);
    let nieuw = false;
    if (!leadId && soort === "BOOKING_CREATED") {
      // A clinic that found Leno by itself: it starts as a lead with a booked call.
      const ig = /instagram\.com|^@/i.test(websiteOfIg);
      const [rij] = await dbJson<{ id: string }[]>("leads", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          kliniek: kliniek || naam || email,
          email: email || null,
          website: ig ? null : websiteOfIg || null,
          instagram: ig ? websiteOfIg : null,
          bron: "Cal.com",
          contact_via: "E-mail",
          status: "Gesprek gepland",
          fase: "MEETING_BOOKED",
          notities: naam ? `Geboekt door ${naam}` : null,
        }),
      });
      leadId = rij.id;
      nieuw = true;
    }
    if (!leadId) return json({ ok: true, gekoppeld: false });

    // Log once per Cal.com delivery; a duplicate delivery returns no row and stops here.
    const gelogd = await dbJson<unknown[]>("lead_gebeurtenissen?on_conflict=extern_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({
        lead_id: leadId,
        soort: "call",
        kanaal: "calcom",
        inhoud: `${soort} ${p.startTime ?? ""}`.trim(),
        data: { trigger: soort, uid: p.uid, start: p.startTime, einde: p.endTime, naam, email, kliniek, website: websiteOfIg, demo: demoToken || null },
        bron: "calcom",
        extern_id: `cal:${p.uid}:${soort}:${p.startTime ?? ""}`,
      }),
    });
    if (!gelogd.length) return json({ ok: true, dubbel: true });

    if (FASE[soort] && !nieuw) {
      await dbJson("rpc/lead_vooruit", { method: "POST", body: JSON.stringify({ p_lead: leadId, p_fase: FASE[soort] }) });
    } else if (soort === "BOOKING_CANCELLED") {
      // Back to where the lead stood before the booking, but only if nothing moved it on since.
      const [lead] = await dbJson<{ fase: string }[]>(`leads?select=fase&id=eq.${leadId}`);
      if (lead?.fase === "MEETING_BOOKED") {
        const [voor] = await dbJson<{ data: { van: string | null } }[]>(
          `lead_gebeurtenissen?select=data&lead_id=eq.${leadId}&soort=eq.fase&data->>naar=eq.MEETING_BOOKED&order=id.desc&limit=1`,
        );
        await dbJson(`leads?id=eq.${leadId}`, {
          method: "PATCH",
          body: JSON.stringify({ fase: voor?.data?.van ?? "NURTURE" }),
        });
      }
    }
    return json({ ok: true, lead: leadId, nieuw });
  } catch (e) {
    console.error(e);
    // 500 makes Cal.com retry later; the extern_id keeps that retry from counting twice.
    return json({ fout: "Verwerken mislukt" }, 500);
  }
});
