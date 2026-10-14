-- One fixed funnel stage per lead, so Leno can see where clinics drop off (reply rate, demo → call, call → client).
-- `status` stays as the free-text column the sheet and the daily dashboard blocks use; `fase` is derived from it
-- automatically, and events the sheet does not know about (demo used, call booked via Cal.com, call held, client)
-- set `fase` directly. Every change of fase lands in lead_gebeurtenissen, so each clinic gets a timeline.

alter table public.leads
  add column if not exists fase text not null default 'NEW',
  add column if not exists fase_sinds timestamptz not null default now(),
  -- Every stage this lead has ever had. The funnel counts from this, so a clinic that got a demo without replying
  -- does not count as a reply, and a lost clinic still counts for the steps it really took.
  add column if not exists bereikte_fases text[] not null default '{}';

alter table public.leads drop constraint if exists leads_fase_check;
alter table public.leads add constraint leads_fase_check check (fase in (
  'NEW', 'QUALIFIED', 'WARMING', 'CONTACTED', 'FOLLOW_UP', 'REPLIED', 'DEMO_READY', 'DEMO_SENT', 'DEMO_USED',
  'MEETING_BOOKED', 'MEETING_HELD', 'WON', 'LOST', 'NURTURE', 'DISQUALIFIED'
));

create index if not exists leads_fase_idx on public.leads (fase);

-- Order used to move a lead only forward. LOST, NURTURE and DISQUALIFIED are side exits and have no rank.
create or replace function public.lead_fase_rang(f text) returns integer
language sql immutable set search_path = '' as $$
  select case f
    when 'NEW' then 0 when 'QUALIFIED' then 1 when 'WARMING' then 2 when 'CONTACTED' then 3
    when 'FOLLOW_UP' then 4 when 'REPLIED' then 5 when 'DEMO_READY' then 6 when 'DEMO_SENT' then 7
    when 'DEMO_USED' then 8 when 'MEETING_BOOKED' then 9 when 'MEETING_HELD' then 10 when 'WON' then 11
  end
$$;

-- The sheet's Dutch status → stage. Unknown statuses return null and leave the stage alone.
create or replace function public.lead_fase_van_status(s text) returns text
language sql immutable set search_path = '' as $$
  select case s
    when 'Nieuw' then 'NEW'
    when 'Nakijken' then 'NEW'
    when 'Klaar om te sturen' then 'QUALIFIED'
    when 'Opwarmen' then 'WARMING'
    when 'DM verstuurd' then 'CONTACTED'
    when 'Opgevolgd 1' then 'FOLLOW_UP'
    when 'Opgevolgd 2' then 'FOLLOW_UP'
    when 'Geantwoord' then 'REPLIED'
    when 'Demo klaar' then 'DEMO_READY'
    when 'Demo verstuurd' then 'DEMO_SENT'
    when 'Gesprek gepland' then 'MEETING_BOOKED'
    when 'Gesprek gehad' then 'MEETING_HELD'
    when 'Klant' then 'WON'
    when 'Verloren' then 'LOST'
    when 'Later' then 'NURTURE'
    when 'Niet geschikt' then 'DISQUALIFIED'
  end
$$;

-- Backfill before the triggers exist, so the start state is not logged as 215 fake events.
update public.leads set fase = coalesce(public.lead_fase_van_status(status), 'NEW');
-- Start history: the current stage, plus CONTACTED for everyone who is past it (they all got a first message).
update public.leads set bereikte_fases = array_remove(array[
  case when coalesce(public.lead_fase_rang(fase), 0) > 3 then 'CONTACTED' end, fase], null);

-- Demo requests point to their lead, so demo events (DM sent, clinic asked questions) move the lead's stage.
alter table public.demo_aanvragen add column if not exists lead_id uuid references public.leads (id) on delete set null;
create index if not exists demo_aanvragen_lead_idx on public.demo_aanvragen (lead_id);

-- "www.Example.be/path" → "example.be". Marketplaces and link pages are shared by many clinics, so they never identify one.
create or replace function public.lead_domein(url text) returns text
language sql immutable set search_path = '' as $$
  select nullif(d, '') from (
    select lower(regexp_replace(coalesce(url, ''), '^\s*(https?://)?(www\.)?([^/?#\s]+).*$', '\3')) as d
  ) x
  where d not in ('treatwell.be', 'treatwell.nl', 'instagram.com', 'facebook.com', 'linktr.ee', 'tilda.ws', 'wixsite.com', 'planity.com', 'salonized.com')
    and d !~ '\.(tilda\.ws|wixsite\.com)$'
$$;

-- "@Name", "instagram.com/name/" or "name" → "name".
create or replace function public.lead_handle(ig text) returns text
language sql immutable set search_path = '' as $$
  select nullif(lower(regexp_replace(regexp_replace(trim(coalesce(ig, '')), '^.*instagram\.com/', ''), '^@|[/?#].*$', '', 'g')), '')
$$;

-- Find the lead for a clinic: Instagram handle first, then e-mail, then a website domain that belongs to exactly one lead.
create or replace function public.lead_zoeken(p_instagram text, p_website text, p_email text) returns uuid
language sql stable set search_path = '' as $$
  select coalesce(
    (select id from public.leads where instagram_handle = public.lead_handle(p_instagram) limit 1),
    (select id from public.leads where p_email is not null and lower(email) = lower(trim(p_email)) limit 1),
    (select min(id::text)::uuid from public.leads
      where public.lead_domein(website) = public.lead_domein(p_website)
      having count(*) = 1)
  )
$$;

update public.demo_aanvragen set lead_id = public.lead_zoeken(instagram, website, null) where lead_id is null;

-- BEFORE trigger on leads: derive fase from status, track since-when and the furthest stage.
-- A status change from the sheet never pulls a lead back out of DEMO_USED, MEETING_BOOKED, MEETING_HELD or WON,
-- because the sheet does not know about those; only an exit (LOST, NURTURE, DISQUALIFIED) or WON overrides them.
create or replace function public.leads_fase_afleiden() returns trigger
language plpgsql set search_path = '' as $$
declare
  afgeleid text := public.lead_fase_van_status(new.status);
begin
  if tg_op = 'INSERT' then
    if new.fase = 'NEW' and afgeleid is not null then new.fase := afgeleid; end if;
  elsif new.status is distinct from old.status and new.fase is not distinct from old.fase and afgeleid is not null
    and (old.fase not in ('DEMO_USED', 'MEETING_BOOKED', 'MEETING_HELD', 'WON')
         or afgeleid in ('WON', 'LOST', 'NURTURE', 'DISQUALIFIED')) then
    new.fase := afgeleid;
  end if;
  if tg_op = 'INSERT' or new.fase is distinct from old.fase then
    new.fase_sinds := now();
    if not (new.fase = any(new.bereikte_fases)) then new.bereikte_fases := new.bereikte_fases || new.fase; end if;
  end if;
  return new;
end $$;

drop trigger if exists leads_fase_afleiden on public.leads;
create trigger leads_fase_afleiden before insert or update on public.leads
for each row execute function public.leads_fase_afleiden();

-- AFTER trigger: one timeline event per stage change. Writers can name themselves with the header x-qore-bron.
create or replace function public.leads_fase_loggen() returns trigger
language plpgsql set search_path = '' as $$
declare
  van text := case when tg_op = 'UPDATE' then old.fase end;
  bron text := coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-qore-bron', 'database');
begin
  if tg_op = 'INSERT' or new.fase is distinct from old.fase then
    insert into public.lead_gebeurtenissen (lead_id, soort, kanaal, inhoud, data, bron)
    values (new.id, 'fase', 'systeem', coalesce(van, '—') || ' → ' || new.fase,
            jsonb_build_object('van', van, 'naar', new.fase, 'status', new.status), bron);
  end if;
  return null;
end $$;

drop trigger if exists leads_fase_loggen on public.leads;
-- Not "update of fase": a stage derived inside the BEFORE trigger is not in the SET list and would be missed.
create trigger leads_fase_loggen after insert or update on public.leads
for each row execute function public.leads_fase_loggen();

-- Move a lead forward to a stage, never backward (and never out of WON or a side exit).
-- Security definer so the demo triggers also work when the demo chat writes with a narrower role.
create or replace function public.lead_vooruit(p_lead uuid, p_fase text) returns void
language sql security definer set search_path = '' as $$
  update public.leads set fase = p_fase
  where id = p_lead
    and public.lead_fase_rang(fase) is not null
    and public.lead_fase_rang(fase) < public.lead_fase_rang(p_fase)
$$;

-- Demo requests: link to the lead on insert; DM sent → DEMO_SENT.
create or replace function public.demo_aanvraag_naar_lead() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Funnel bookkeeping must never block a demo request, so any error here is only a warning.
  begin
    if tg_op = 'INSERT' and new.lead_id is null then
      new.lead_id := public.lead_zoeken(new.instagram, new.website, new.email);
    end if;
    if new.lead_id is not null and new.dm_verstuurd_op is not null
       and (tg_op = 'INSERT' or old.dm_verstuurd_op is null) then
      perform public.lead_vooruit(new.lead_id, 'DEMO_SENT');
    end if;
  exception when others then
    raise warning 'demo_aanvraag_naar_lead: %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists demo_aanvraag_naar_lead on public.demo_aanvragen;
create trigger demo_aanvraag_naar_lead before insert or update of dm_verstuurd_op on public.demo_aanvragen
for each row execute function public.demo_aanvraag_naar_lead();

-- A question from the clinic in its demo (rol 'kliniek'; Leno's review tests are not logged here) → DEMO_USED.
create or replace function public.demo_bericht_naar_lead() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Never let funnel bookkeeping break the demo chat.
  begin
    if new.rol = 'kliniek' then
      perform public.lead_vooruit(d.lead_id, 'DEMO_USED')
      from public.demo_aanvragen d where d.id = new.aanvraag_id and d.lead_id is not null and d.dm_verstuurd_op is not null;
    end if;
  exception when others then
    raise warning 'demo_bericht_naar_lead: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists demo_bericht_naar_lead on public.demo_berichten;
create trigger demo_bericht_naar_lead after insert on public.demo_berichten
for each row execute function public.demo_bericht_naar_lead();

-- Catch up on demos that were already sent and used before these triggers existed (now logged as events).
select public.lead_vooruit(lead_id, 'DEMO_SENT') from public.demo_aanvragen where lead_id is not null and dm_verstuurd_op is not null;
select public.lead_vooruit(d.lead_id, 'DEMO_USED') from public.demo_aanvragen d
where d.lead_id is not null and d.dm_verstuurd_op is not null
  and exists (select 1 from public.demo_berichten b where b.aanvraag_id = d.id and b.rol = 'kliniek' and b.created_at > d.dm_verstuurd_op);

-- Funnel: per stage, how many leads ever had it and how many sit there now.
create or replace view public.lead_funnel with (security_invoker = true) as
select f.fase, f.rang,
       (select count(*) from public.leads l where f.fase = any(l.bereikte_fases)) as bereikt,
       (select count(*) from public.leads l where l.fase = f.fase) as nu
from (values ('NEW', 0), ('QUALIFIED', 1), ('WARMING', 2), ('CONTACTED', 3), ('FOLLOW_UP', 4), ('REPLIED', 5),
             ('DEMO_READY', 6), ('DEMO_SENT', 7), ('DEMO_USED', 8), ('MEETING_BOOKED', 9), ('MEETING_HELD', 10),
             ('WON', 11), ('LOST', null), ('NURTURE', null), ('DISQUALIFIED', null)) as f(fase, rang)
order by f.rang nulls last;

grant select on public.lead_funnel to service_role;
-- The functions run inside the service-role writers (n8n, Edge Functions); keep them away from the public keys.
revoke execute on function public.lead_vooruit(uuid, text), public.lead_zoeken(text, text, text) from public, anon, authenticated;
grant execute on function public.lead_vooruit(uuid, text), public.lead_zoeken(text, text, text) to service_role;
