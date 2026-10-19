-- Leno's fixed costs (subscriptions, domains, mail), next to the AI costs in the dashboard's Verbruik tab,
-- so a month shows everything that was spent. Leno edits them in the dashboard.
create table if not exists public.vaste_kosten (
  id          bigint generated always as identity primary key,
  naam        text not null,
  categorie   text,
  bedrag      numeric(10, 2) not null default 0 check (bedrag >= 0),
  valuta      text not null default 'EUR' check (valuta in ('EUR', 'USD')),
  per         text not null default 'maand' check (per in ('maand', 'jaar')),
  actief      boolean not null default true,
  notitie     text,
  aangemaakt_op timestamptz not null default now()
);

alter table public.vaste_kosten enable row level security;
grant select, insert, update, delete on public.vaste_kosten to service_role;
grant usage, select on sequence public.vaste_kosten_id_seq to service_role;

insert into public.vaste_kosten (naam, categorie, valuta, per, notitie) values
  ('n8n Cloud (Starter)', 'Automatisering', 'EUR', 'maand', 'Bedrag invullen'),
  ('Supabase', 'Database', 'USD', 'maand', 'Nu gratis plan'),
  ('Vercel', 'Website', 'USD', 'maand', 'Nu gratis plan'),
  ('Firecrawl', 'Websites lezen', 'USD', 'maand', 'Bedrag invullen'),
  ('Brave Search API', 'Leads zoeken', 'USD', 'maand', 'Bedrag invullen'),
  ('Namecheap Private Email (support@)', 'E-mail', 'USD', 'jaar', 'Betaald tot 25/06/2027'),
  ('Domeinnamen (qoreaesthetics.com, qorelabs.io)', 'Domeinen', 'USD', 'jaar', 'Bedrag invullen'),
  ('Cal.com', 'Agenda', 'USD', 'maand', 'Nu gratis plan');
