import { useCallback, useEffect, useState } from "react";

// The Supabase function "tokens-verversen" keeps each channel's Meta token encrypted in Supabase and refreshes
// Instagram tokens every night. Here Leno pastes a token once per channel; it is checked at Meta, stored, and never
// shown again.
const TOKENS_URL = "https://gqigmmezcmtwusgbdxny.supabase.co/functions/v1/tokens-verversen";

type Kanaal = {
  id: string;
  channel: "instagram" | "facebook" | "whatsapp";
  account_id: string | null;
  account_label: string | null;
  is_enabled: boolean;
  token_status: "ontbreekt" | "ok" | "fout";
  token_verloopt_op: string | null;
  token_ververst_op: string | null;
  token_fout: string | null;
  clinics: { name: string } | null;
};

const KANAAL_NAAM = { instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp" } as const;

const STATUS = {
  ontbreekt: { tekst: "Geen token", kleur: "border-border text-muted-foreground" },
  ok: { tekst: "Token in orde", kleur: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  fout: { tekst: "Opnieuw koppelen", kleur: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400" },
} as const;

const datum = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" }) : null;

const veld =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2";
const hoofdknop =
  "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50";

export function KanaalTokens({ sleutel }: { sleutel: string }) {
  const [kanalen, setKanalen] = useState<Kanaal[]>([]);
  const [invoer, setInvoer] = useState<Record<string, string>>({});
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<Record<string, string>>({});
  const [fout, setFout] = useState<string | null>(null);

  const vraag = useCallback(
    async (body: Record<string, unknown>) => {
      const antwoord = await fetch(TOKENS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-beheercode": sleutel },
        body: JSON.stringify(body),
      });
      const data = await antwoord.json().catch(() => ({}));
      if (!antwoord.ok || data.ok === false) throw new Error(data?.fout ?? `status ${antwoord.status}`);
      return data;
    },
    [sleutel],
  );

  const ophalen = useCallback(async () => {
    setFout(null);
    try {
      setKanalen((await vraag({ actie: "lijst" })).kanalen);
    } catch (e) {
      setFout(`De kanalen laden lukte niet (${e instanceof Error ? e.message : "onbekend"}).`);
    }
  }, [vraag]);

  useEffect(() => {
    ophalen();
  }, [ophalen]);

  const opslaan = async (k: Kanaal) => {
    const token = (invoer[k.id] ?? "").trim();
    if (!token) return;
    setBezig(k.id);
    setMelding((m) => ({ ...m, [k.id]: "" }));
    try {
      const data = await vraag({ actie: "opslaan", kanaal_id: k.id, token });
      setInvoer((i) => ({ ...i, [k.id]: "" }));
      setMelding((m) => ({
        ...m,
        [k.id]: data.verloopt_op ? `Opgeslagen. Geldig tot ${datum(data.verloopt_op)}, wordt vanzelf verlengd.` : "Opgeslagen.",
      }));
      await ophalen();
    } catch (e) {
      setMelding((m) => ({ ...m, [k.id]: `Niet opgeslagen: ${e instanceof Error ? e.message : "onbekend"}` }));
    } finally {
      setBezig(null);
    }
  };

  return (
    <section className="mt-10 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-foreground">Kanaal-tokens</h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Plak per kanaal één keer het token van Meta. Het wordt bij Meta nagekeken, versleuteld bewaard en daarna niet meer
        getoond. Instagram-tokens worden elke nacht verlengd; lukt dat niet, dan krijgt u een melding op Telegram.
      </p>
      {fout && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{fout}</p>}

      <div className="space-y-3">
        {kanalen.map((k) => {
          const status = STATUS[k.token_status];
          return (
            <article key={k.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{KANAAL_NAAM[k.channel]}</span>
                <span className="text-sm text-muted-foreground">
                  {k.account_label ?? k.account_id}
                  {k.clinics?.name ? ` · ${k.clinics.name}` : ""}
                </span>
                <span className={`ml-auto rounded-full border px-3 py-1 text-xs ${status.kleur}`}>{status.tekst}</span>
              </div>
              {k.token_status === "ok" && k.token_verloopt_op && (
                <p className="mt-1 text-xs text-muted-foreground">Geldig tot {datum(k.token_verloopt_op)}</p>
              )}
              {k.token_status === "fout" && k.token_fout && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{k.token_fout}</p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  className={veld}
                  placeholder={k.token_status === "ok" ? "Nieuw token plakken om te vervangen" : "Token plakken"}
                  value={invoer[k.id] ?? ""}
                  onChange={(e) => setInvoer((i) => ({ ...i, [k.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className={hoofdknop}
                  disabled={bezig === k.id || !(invoer[k.id] ?? "").trim()}
                  onClick={() => opslaan(k)}
                >
                  {bezig === k.id ? "Nakijken…" : "Opslaan"}
                </button>
              </div>
              {melding[k.id] && <p className="mt-2 text-xs text-muted-foreground">{melding[k.id]}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
