-- Deel 1 betalingen: every Stripe payment per client, and the chatbot only works while the client pays.
-- The Edge Function "onboarding" fills this from Stripe webhooks; "kliniek-login" refuses a token when the client
-- does not pay. Clients without Stripe (added by hand) and our own clinics have no betaalstatus and are never blocked.

-- wacht_op_betaling  SEPA checkout done, the bank has not confirmed yet: chatbot off
-- actief             paid
-- betaalprobleem     a monthly payment failed; the chatbot keeps working for 5 days (betaalprobleem_sinds)
-- gestopt            still unpaid after 5 days, or the first SEPA payment failed: chatbot off
-- opgezegd           subscription ended: chatbot off
alter table public.onboardingen
  add column if not exists betaalstatus text
    check (betaalstatus is null or betaalstatus in ('wacht_op_betaling', 'actief', 'betaalprobleem', 'gestopt', 'opgezegd')),
  add column if not exists betaalprobleem_sinds timestamptz,
  -- The client asked to stop: the subscription ends on this date (Stripe cancel_at_period_end / cancel_at).
  add column if not exists opzegging_op timestamptz;

-- Stripe clients that already exist were paid by card.
update public.onboardingen set betaalstatus = 'actief' where bron = 'stripe' and betaalstatus is null;

create table if not exists public.betalingen (
  id uuid primary key default gen_random_uuid(),
  -- Stripe payments are matched on the subscription, because Stripe may send the invoice before the checkout.
  stripe_abonnement text,
  onboarding_id uuid references public.onboardingen(id) on delete set null,
  soort text not null check (soort in ('opstart', 'abonnement')),
  bron text not null check (bron in ('stripe', 'wise', 'handmatig')),
  status text not null check (status in ('betaald', 'mislukt', 'open')),
  bedrag_cent integer not null default 0,
  valuta text not null default 'eur',
  periode_van timestamptz,
  periode_tot timestamptz,
  -- One row per Stripe invoice: a failed invoice that is paid later becomes "betaald".
  stripe_factuur text unique,
  referentie text,
  datum timestamptz not null default now()
);

create index if not exists betalingen_abonnement on public.betalingen (stripe_abonnement);
create index if not exists betalingen_onboarding on public.betalingen (onboarding_id);

alter table public.betalingen enable row level security;
grant select, insert, update on public.betalingen to service_role;

-- Every hour: clients whose payment failed more than 5 days ago are stopped. The function only looks at the
-- database, so it needs no key; it sends Leno one Telegram message per stopped client.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('betalingen-controle') where exists (select 1 from cron.job where jobname = 'betalingen-controle');
select cron.schedule(
  'betalingen-controle',
  '7 * * * *',
  $$select net.http_post(
    url := 'https://gqigmmezcmtwusgbdxny.supabase.co/functions/v1/onboarding',
    body := '{"controle": true}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  )$$
);
