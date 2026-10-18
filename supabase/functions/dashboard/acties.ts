// The dashboard buttons, moved 1:1 from n8n workflow "Dashboard vandaag (Leads)" (node "Actie vertalen") on 18/10,
// when the database became the only source of the leads. Pure logic, no database access, so it can be tested alone.

export type ActieNaam =
  | "verstuurd"
  | "opvolging1"
  | "opvolging2"
  | "geantwoord"
  | "naar_morgen"
  | "vraagknop_heeft"
  | "vraagknop_geenknop"
  | "vraagknop_getikt"
  | "vraagknop_geen"
  | "vraagknop_wel";

export type Actie = { id: string; actie: ActieNaam; tijd?: string };

// What the rules need to know about a lead before they change it.
export type LeadNu = { id: string; contact_via: string | null; bericht: string | null; vraagknop: string | null };

export type LeadPatch = {
  status?: string;
  opvolgen_op?: string;
  volgende_stap?: string;
  vraagknop?: string;
  bericht?: string;
};

const ZONE = "Europe/Brussels";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Status step: new status, days until the next contact, and the "next step" text in front of the date.
const STAPPEN: Record<string, [string, number, string]> = {
  verstuurd: ["DM verstuurd", 3, "Opvolging 1 (kolom Y) sturen op "],
  opvolging1: ["Opgevolgd 1", 5, "Opvolging 2 (kolom Z) sturen op "],
  opvolging2: ["Opgevolgd 2", 10, "Geen antwoord: stoppen op "],
  geantwoord: ["Geantwoord", 0, "Antwoord lezen en reageren op "],
};
const ANDERE = new Set(["naar_morgen", "vraagknop_heeft", "vraagknop_geenknop", "vraagknop_getikt", "vraagknop_geen", "vraagknop_wel"]);

function delen(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: ZONE, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { dag: p.day, maand: p.month, jaar: p.year, uur: p.hour, minuut: p.minute };
}

// dd/mm/yy in Brussels, the format the sheet and the dashboard always used.
export const fmt = (d: Date) => { const p = delen(d); return `${p.dag}/${p.maand}/${p.jaar.slice(2)}`; };
const uur = (d: Date) => { const p = delen(d); return `${p.uur}:${p.minuut}`; };
// yyyy-mm-dd in Brussels, for the date column opvolgen_op.
const iso = (d: Date) => { const p = delen(d); return `${p.jaar}-${p.maand}-${p.dag}`; };

export class ActieFout extends Error {}

// Turns a batch of dashboard marks into one patch per lead. Throws ActieFout on bad input (nothing is written then).
export function vertaalActies(acties: Actie[], leads: Map<string, LeadNu>, nu = new Date()): Map<string, LeadPatch> {
  if (!Array.isArray(acties) || acties.length === 0 || acties.length > 300) throw new ActieFout("Geen of te veel acties");
  const over = (dagen: number) => new Date(nu.getTime() + dagen * 864e5);
  for (const a of acties) {
    if (!a || typeof a.id !== "string" || !UUID.test(a.id)) throw new ActieFout("Ongeldige lead");
    if (!STAPPEN[a.actie] && !ANDERE.has(a.actie)) throw new ActieFout(`Onbekende actie: ${a?.actie}`);
    if (!leads.has(a.id)) throw new ActieFout("Lead niet gevonden");
  }
  // A status step sets its own date, so "naar morgen" on the same lead is ignored.
  const metStatus = new Set(acties.filter((a) => STAPPEN[a.actie]).map((a) => a.id));
  const uit = new Map<string, LeadPatch>();
  const patch = (id: string) => { let p = uit.get(id); if (!p) { p = {}; uit.set(id, p); } return p; };

  for (const a of acties) {
    const lead = leads.get(a.id)!;
    const geklikt = Date.parse(a.tijd ?? "");
    const tijd = Number.isFinite(geklikt) && geklikt <= nu.getTime() + 6e4 && geklikt > nu.getTime() - 3 * 864e5 ? new Date(geklikt) : nu;
    const stap = STAPPEN[a.actie];
    if (stap) {
      const datum = over(stap[1]);
      Object.assign(patch(a.id), { status: stap[0], opvolgen_op: iso(datum), volgende_stap: stap[2] + fmt(datum).slice(0, 5) });
    } else if (a.actie === "naar_morgen") {
      if (!metStatus.has(a.id)) patch(a.id).opvolgen_op = iso(over(1));
    } else if (a.actie === "vraagknop_heeft") {
      patch(a.id).vraagknop = `Heeft vraagknoppen (gezien ${fmt(tijd)}), nog tikken`;
    } else if (a.actie === "vraagknop_geenknop") {
      patch(a.id).vraagknop = `Geen vraagknoppen (gezien ${fmt(tijd)})`;
    } else if (a.actie === "vraagknop_getikt") {
      patch(a.id).vraagknop = `Getikt op ${fmt(tijd)} ${uur(tijd)} [${tijd.toISOString()}]`;
    } else {
      // vraagknop_wel / vraagknop_geen: only after a tap, whose moment sits in the text as [ISO].
      const aa = lead.vraagknop ?? "";
      const getiktIso = (aa.match(/\[(\d{4}-[^\]]+)\]/) ?? [])[1];
      if (!getiktIso) continue;
      if (a.actie === "vraagknop_wel") {
        patch(a.id).vraagknop = `${aa} -> wel antwoord gekregen`;
        continue;
      }
      const getikt = new Date(getiktIso);
      const uren = Math.max(1, Math.round(((nu.getTime() - getikt.getTime()) / 36e5) * 10) / 10);
      patch(a.id).vraagknop = `${aa} -> +${String(uren).replace(".", ",")}u: geen antwoord`;
      // The pain point goes into the Instagram DM, once.
      const m = lead.bericht ?? "";
      const fr = m.startsWith("Bonjour");
      const vandaag = fmt(getikt) === fmt(nu);
      const dag = vandaag ? (fr ? "aujourd'hui" : "vandaag") : (fr ? "hier" : "gisteren");
      const zin = fr
        ? `PS : ${dag} à ${uur(getikt)}, j'ai cliqué sur une des questions proposées dans votre chat Instagram et je n'ai pas encore reçu de réponse. Ce n'est pas un reproche, c'est justement là que beaucoup de clients décrochent.`
        : `PS: ik tikte ${dag} om ${uur(getikt)} in jullie Instagram-chat op een van de voorgestelde vragen en kreeg nog geen antwoord. Geen verwijt, maar net daar haken veel klanten af.`;
      if (lead.contact_via === "Instagram-DM" && m && !m.includes(fr ? "questions proposées" : "voorgestelde vragen")) {
        const nieuw = m.replace(/\n\nLeno\s*$/, `\n\n${zin}\n\nLeno`);
        patch(a.id).bericht = nieuw === m ? `${m}\n\n${zin}` : nieuw;
      }
    }
  }
  return uit;
}
