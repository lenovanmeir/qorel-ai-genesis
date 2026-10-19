-- Which demo or intake an AI call was for (e.g. the intake code), so own costs can be shown per prospect.
alter table public.ai_verbruik add column if not exists referentie text;
create index if not exists ai_verbruik_referentie_idx on public.ai_verbruik (referentie);

-- A paying client. Costs of clinics that are not (yet) a client count as Leno's own costs (demos, tests).
alter table public.clinics add column if not exists is_klant boolean not null default false;
