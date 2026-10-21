-- P3 website widget: one script tag per clinic (<script src="https://qoreaesthetics.com/widget.js" data-kliniek="slug">).
-- The look and the websites it may run on live here, so Leno changes them on /beheer without touching the clinic's site.
-- Only the Edge Function "widget" reads and writes these tables (service role); RLS on with no policies.

create table if not exists public.widget_instellingen (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  kleur text not null default '#9a9cff' check (kleur ~ '^#[0-9a-fA-F]{6}$'),
  logo_url text check (logo_url is null or logo_url ~ '^https://'),
  -- Name in the chat header; empty = clinics.name.
  weergavenaam text,
  welkom_nl text,
  welkom_fr text,
  welkom_en text,
  -- Hostnames the widget may run on, without https:// or www. (www. and subdomains count as well).
  domeinen text[] not null default '{}',
  positie text not null default 'rechts' check (positie in ('rechts', 'links')),
  -- Safety cap on messages per clinic per day, so a misused widget can never run up AI costs.
  max_per_dag integer not null default 300 check (max_per_dag between 1 and 5000),
  is_actief boolean not null default true,
  aangemaakt_op timestamptz not null default now(),
  gewijzigd_op timestamptz not null default now()
);

alter table public.widget_instellingen enable row level security;

-- Messages per clinic per day; the Edge Function counts and checks in one step through widget_tel().
create table if not exists public.widget_teller (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  dag date not null default (now() at time zone 'Europe/Brussels')::date,
  aantal integer not null default 0,
  primary key (clinic_id, dag)
);

alter table public.widget_teller enable row level security;

-- Adds one message and says whether the clinic is still under its daily cap.
create or replace function public.widget_tel(p_clinic uuid, p_max integer)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  insert into public.widget_teller as t (clinic_id, dag, aantal)
  values (p_clinic, (now() at time zone 'Europe/Brussels')::date, 1)
  on conflict (clinic_id, dag) do update set aantal = t.aantal + 1
  returning aantal <= p_max;
$$;

revoke all on function public.widget_tel(uuid, integer) from public, anon, authenticated;
grant execute on function public.widget_tel(uuid, integer) to service_role;

-- Qore Aesthetics is the first clinic with the widget: on its own site.
insert into public.widget_instellingen (clinic_id, kleur, weergavenaam, welkom_nl, welkom_fr, welkom_en, domeinen)
values (
  'a0e5a000-0000-4000-a000-000000000001', '#9a9cff', 'Qore Aesthetics',
  'Hoi! Ik ben de AI-receptioniste van Qore Aesthetics. Waarmee kan ik je helpen?',
  'Bonjour ! Je suis la réceptionniste IA de Qore Aesthetics. Comment puis-je vous aider ?',
  'Hi! I''m the AI receptionist of Qore Aesthetics. How can I help?',
  array['qoreaesthetics.com']
)
on conflict (clinic_id) do nothing;

-- New tables in this project get no default grants, so the Edge Function's service role needs them explicitly.
grant select, insert, update on public.widget_instellingen to service_role;
grant select, insert, update on public.widget_teller to service_role;
