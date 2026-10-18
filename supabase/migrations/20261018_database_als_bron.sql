-- P0 (18/10): the database becomes the only source of the leads. The Google Sheet "Leads" is from now on a
-- read-only copy that a nightly n8n workflow writes; nobody types in it any more.
-- Backups made just before: backup.leads_20261018, backup.lead_gebeurtenissen_20261018, backup.demo_aanvragen_20261018.

-- Settings of the nightly lead finder, until now tab "Instellingen" of the sheet plus n8n static data.
-- One row (id = 1). volgende_index = which city × search term combination comes next (steden × zoektermen,
-- city by city); 50 = Brasschaat / huidkliniek, where the run of 17/10 stopped.
create table if not exists public.zoeker_instellingen (
  id              integer primary key default 1 check (id = 1),
  zoeken          boolean not null default true,
  per_nacht       integer not null default 30 check (per_nacht between 1 and 100),
  steden          text[]  not null,
  zoektermen      text[]  not null,
  taal            text    not null default 'Automatisch',
  volgende_index  integer not null default 0 check (volgende_index >= 0),
  bijgewerkt_op   timestamptz not null default now()
);

alter table public.zoeker_instellingen enable row level security;
grant select, update on public.zoeker_instellingen to service_role;

insert into public.zoeker_instellingen (id, zoeken, per_nacht, steden, zoektermen, taal, volgende_index)
values (1, true, 30,
  array['Antwerpen','Berchem','Wilrijk','Deurne','Mortsel','Edegem','Kontich','Schoten','Brasschaat','Kapellen','Lier',
        'Mechelen','Gent','Brussel','Leuven','Hasselt','Genk','Brugge','Kortrijk','Aalst','Sint-Niklaas','Turnhout',
        'Herentals','Geel','Roeselare','Oostende','Knokke-Heist','Liège','Namur','Charleroi','Mons','Waterloo','Wavre'],
  array['esthetische kliniek','botox fillers','huidkliniek','aesthetic clinic','skin clinic','laserontharing'],
  'Automatisch', 50)
on conflict (id) do nothing;

create or replace function public.zoeker_instellingen_bijgewerkt() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.bijgewerkt_op := now();
  return new;
end $$;

drop trigger if exists zoeker_instellingen_bijgewerkt on public.zoeker_instellingen;
create trigger zoeker_instellingen_bijgewerkt before update on public.zoeker_instellingen
for each row execute function public.zoeker_instellingen_bijgewerkt();

-- New leads no longer get a sheet row; the dashboard sorts them on aangemaakt_op.
create index if not exists leads_aangemaakt_idx on public.leads (aangemaakt_op);

-- A demo whose link works (verstuurd_op) and whose Instagram DM went out (dm_verstuurd_op) is not "te controleren"
-- any more. A rebuild of such a demo used to put it back there (13/10); this keeps the label honest on every write.
create or replace function public.demo_status_rechtzetten() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'te_controleren' and new.verstuurd_op is not null and new.dm_verstuurd_op is not null then
    new.status := 'verstuurd';
  end if;
  return new;
end $$;

drop trigger if exists demo_status_rechtzetten on public.demo_aanvragen;
create trigger demo_status_rechtzetten before insert or update on public.demo_aanvragen
for each row execute function public.demo_status_rechtzetten();

-- The demos that already have this mismatch (Nōré, Sveltekliniek, Ness Aesthetic, Deluxe Clinic on 18/10).
update public.demo_aanvragen set status = 'verstuurd'
where status = 'te_controleren' and verstuurd_op is not null and dm_verstuurd_op is not null;
