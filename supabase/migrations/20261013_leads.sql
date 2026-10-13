-- Leads move from the Google Sheet "Qore aesthetic instagram" (tab Leads) into the database.
-- One row per clinic from first find to client; every touch (DM, reply, like, demo, call, payment)
-- goes into lead_gebeurtenissen so each clinic has one timeline. The sheet becomes a nightly copy.
-- Columns mirror sheet columns A–AB so the dashboard logic carries over one-to-one.

create table public.leads (
  id                  uuid primary key default gen_random_uuid(),
  sheet_rij           integer unique,                 -- row in the sheet, kept during the move
  kliniek             text not null,                  -- A
  stad                text,                           -- B
  instagram           text,                           -- C (as written in the sheet)
  instagram_handle    text unique,                    -- C normalised: lowercase, no @ or URL
  website             text,                           -- D
  telefoon            text,                           -- E
  email               text,                           -- F
  eigenaar            text,                           -- G
  linkedin            text,                           -- H
  kans                integer check (kans between 0 and 100), -- I
  waarom              text,                           -- J
  taal                text,                           -- K
  contact_via         text,                           -- L
  bericht             text,                           -- M
  demo_link           text,                           -- N
  status              text not null default 'Nieuw',  -- O
  opvolgen_op         date,                           -- P
  notities            text,                           -- Q
  toegevoegd          text,                           -- R
  opnieuw_schrijven   text,                           -- S
  bron                text,                           -- T
  volgende_stap       text,                           -- U
  versie              text,                           -- V
  opwarmen            text,                           -- W
  reactie_opwarmen    text,                           -- X
  opvolging_1         text,                           -- Y
  opvolging_2         text,                           -- Z
  vraagknop           text,                           -- AA
  reactie_op_comment  text,                           -- AB
  aangemaakt_op       timestamptz not null default now(),
  bijgewerkt_op       timestamptz not null default now()
);

create index leads_status_opvolgen_idx on public.leads (status, opvolgen_op);

create table public.lead_gebeurtenissen (
  id          bigint generated always as identity primary key,
  lead_id     uuid not null references public.leads (id) on delete cascade,
  soort       text not null,     -- dm_verstuurd, antwoord, hartje, gelezen, getikt, comment, demo, call, factuur, betaald, notitie, ...
  kanaal      text,              -- instagram, mail, dashboard, systeem
  inhoud      text,
  data        jsonb not null default '{}'::jsonb,
  bron        text not null,     -- instagram, dashboard, n8n, claude
  extern_id   text unique,       -- e.g. Instagram message id, so a webhook delivered twice is stored once
  op          timestamptz not null default now()
);

create index lead_gebeurtenissen_lead_op_idx on public.lead_gebeurtenissen (lead_id, op desc);

-- Keep bijgewerkt_op honest without relying on every writer to set it.
create function public.leads_bijgewerkt() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.bijgewerkt_op := now();
  return new;
end $$;

create trigger leads_bijgewerkt before update on public.leads
for each row execute function public.leads_bijgewerkt();

-- Only server-side code (n8n, Edge Functions) with the service role reads or writes these tables.
-- RLS on without policies blocks the public anon/authenticated keys entirely.
alter table public.leads enable row level security;
alter table public.lead_gebeurtenissen enable row level security;

-- New tables in this project get no default grants (see demo_aanvragen), so grant explicitly.
grant select, insert, update, delete on public.leads to service_role;
grant select, insert, update, delete on public.lead_gebeurtenissen to service_role;
grant usage, select on sequence public.lead_gebeurtenissen_id_seq to service_role;
