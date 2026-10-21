-- Step 4 (payment -> onboarding). When a clinic pays (Stripe) or Leno adds a client by hand, the Edge Function
-- "onboarding" creates the clinic, its intake, its own runtime login and its website widget in one go.
-- Only Edge Functions read and write these tables (service role); RLS on with no policies.

create table if not exists public.onboardingen (
  id uuid primary key default gen_random_uuid(),
  bron text not null check (bron in ('stripe', 'handmatig')),
  -- Stripe checkout session: one onboarding per payment, even when Stripe sends the event twice.
  stripe_sessie text unique,
  stripe_klant text,
  stripe_abonnement text,
  pakket text,
  contract text check (contract is null or contract in ('maand', 'jaar')),
  kliniek_naam text not null,
  website text,
  email text,
  taal text not null default 'nl' check (taal in ('nl', 'fr', 'en')),
  clinic_id uuid references public.clinics(id) on delete set null,
  intake_code text,
  -- The setup fee is paid by bank transfer to Wise; Leno ticks this on /beheer when the money has landed.
  opstart_betaald_op timestamptz,
  welkomstmail_op timestamptz,
  -- What went wrong during the automatic steps, so /beheer can show it instead of failing silently.
  fout text,
  aangemaakt_op timestamptz not null default now()
);

alter table public.onboardingen enable row level security;

-- Which Supabase login the chatbot uses for each clinic. The Edge Function "kliniek-login" turns it into a
-- short-lived token for n8n, so no password is stored anywhere.
create table if not exists public.kliniek_runtime (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  user_id uuid not null unique,
  email text not null,
  aangemaakt_op timestamptz not null default now()
);

alter table public.kliniek_runtime enable row level security;

insert into public.kliniek_runtime (clinic_id, user_id, email) values
  ('a0e5a000-0000-4000-a000-000000000001', 'a7712bad-71bc-4288-b9c9-d2601031e864', 'runtime+qore-aesthetics@qorelabs.io'),
  ('d3110000-0000-4000-a000-000000000001', '734f4b22-5778-40f0-a310-290cc0d2ae2d', 'runtime+demo-aesthetics-dev@qorelabs.io')
on conflict (clinic_id) do nothing;

-- New tables in this project get no default grants.
grant select, insert, update on public.onboardingen to service_role;
grant select, insert on public.kliniek_runtime to service_role;
