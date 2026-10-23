-- Process plan P0/P1 (23/10, PROCES-VERBETERPLAN.md): the daily outreach runs on its own and nothing is built that
-- nobody uses.
--
-- 1. Day planner. New leads ("Nieuw") never reached the dashboard's daily blocks by themselves: the Claude daily
--    task used to move them to "Opwarmen", and it stopped working, so 0 DMs went out after 14/10. Every night
--    leads_dag_plannen() tops the pipeline up to per_dag_instagram Instagram leads (warm up + tap today, DM tomorrow)
--    and per_dag_mail e-mail leads (send today). Only the gap is filled, so skipped days never pile up work.
-- 2. Brake on lead finding: while at least max_voorraad leads wait in "Nieuw", the nightly finder stays off.
-- 3. Demos are built only for leads in the pipeline (just in time), and not while max_demos_wachtend of those wait
--    for Leno's review.
-- 4. leads.instagram_id holds the Instagram-scoped id Meta sends, so DMs and replies on @qoreaesthetics are tied to
--    the lead (Edge Function meta-webhook).

alter table public.leads add column if not exists instagram_id text unique;

alter table public.zoeker_instellingen
  add column if not exists planner_aan boolean not null default true,
  add column if not exists per_dag_instagram integer not null default 15,
  add column if not exists per_dag_mail integer not null default 5,
  add column if not exists rem_aan boolean not null default true,  -- off = "zoeken" is only Leno's own switch
  add column if not exists max_voorraad integer not null default 60,
  add column if not exists max_demos_wachtend integer not null default 5;

create or replace function public.leads_dag_plannen()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.zoeker_instellingen%rowtype;
  vandaag date := (now() at time zone 'Europe/Brussels')::date;
  dag text := to_char((now() at time zone 'Europe/Brussels')::date, 'DD/MM/YY');
  open_ig integer;
  open_mail integer;
  gepland_ig integer := 0;
  gepland_mail integer := 0;
  voorraad integer;
begin
  select * into i from public.zoeker_instellingen where id = 1;

  if i.planner_aan then
    select count(*) filter (where contact_via = 'Instagram-DM'), count(*) filter (where contact_via = 'E-mail')
      into open_ig, open_mail
      from public.leads where status in ('Opwarmen', 'Klaar om te sturen');

    -- Instagram: today follow + 1 like + tap a question button; the DM goes out tomorrow (dashboard blocks).
    with gekozen as (
      select id from public.leads
      where status = 'Nieuw' and contact_via = 'Instagram-DM' and coalesce(trim(bericht), '') <> ''
        and instagram_handle is not null and fase in ('NEW', 'QUALIFIED', 'WARMING')
      order by kans desc nulls last, aangemaakt_op
      limit greatest(0, i.per_dag_instagram - open_ig)
    )
    update public.leads l
       set status = 'Opwarmen',
           opwarmen = dag || ': volgen + 1 like + vraagknop tikken (dagplanner)',
           opvolgen_op = vandaag + 1,
           volgende_stap = 'Vandaag opwarmen en tikken, morgen DM sturen'
      from gekozen where l.id = gekozen.id;
    get diagnostics gepland_ig = row_count;

    -- E-mail: no warm-up and no button step, ready to send today.
    with gekozen as (
      select id from public.leads
      where status = 'Nieuw' and contact_via = 'E-mail' and coalesce(trim(bericht), '') <> ''
        and coalesce(trim(email), '') <> '' and fase in ('NEW', 'QUALIFIED', 'WARMING')
      order by kans desc nulls last, aangemaakt_op
      limit greatest(0, i.per_dag_mail - open_mail)
    )
    update public.leads l
       set status = 'Klaar om te sturen',
           opvolgen_op = vandaag,
           volgende_stap = 'Mail vandaag sturen (dagplanner)'
      from gekozen where l.id = gekozen.id;
    get diagnostics gepland_mail = row_count;
  end if;

  select count(*) into voorraad from public.leads
   where status = 'Nieuw' and coalesce(trim(bericht), '') <> '' and contact_via in ('Instagram-DM', 'E-mail');
  if i.rem_aan then
    update public.zoeker_instellingen set zoeken = voorraad < i.max_voorraad
     where id = 1 and zoeken is distinct from (voorraad < i.max_voorraad);
  end if;

  return jsonb_build_object('instagram', gepland_ig, 'mail', gepland_mail, 'voorraad', voorraad,
                            'zoeken', (select zoeken from public.zoeker_instellingen where id = 1));
end;
$$;

revoke all on function public.leads_dag_plannen() from public, anon, authenticated;
grant execute on function public.leads_dag_plannen() to service_role;

-- Just in time: only leads the planner put in the pipeline, and nothing while too many of those wait for review.
create or replace function public.leads_voor_demo()
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  with inst as (select demo_vooraf_aan, max_demos_per_nacht, max_demos_wachtend from zoeker_instellingen where id = 1),
  wachtend as (
    select count(*) as n from demo_aanvragen d join leads l on l.id = d.lead_id
    where d.status = 'te_controleren' and not coalesce(d.hoge_kwaliteit, false)
      and l.status in ('Opwarmen', 'Klaar om te sturen')
  ),
  gekozen as (
    select l.id, l.kliniek, l.stad, l.instagram, l.email, l.website, l.telefoon, l.taal, l.contact_via, l.kans, l.bericht
    from leads l
    where l.kans >= 70
      and coalesce(trim(l.website), '') <> ''
      and (coalesce(trim(l.instagram), '') <> '' or coalesce(trim(l.email), '') <> '')
      and l.status in ('Opwarmen', 'Klaar om te sturen')
      and l.fase in ('NEW', 'QUALIFIED', 'WARMING')
      and not exists (select 1 from demo_aanvragen d where d.lead_id = l.id)
    order by l.kans desc, l.aangemaakt_op asc
    limit (select case when demo_vooraf_aan and (select n from wachtend) < max_demos_wachtend
                       then max_demos_per_nacht else 0 end from inst)
  )
  select jsonb_build_object(
    'aan', (select demo_vooraf_aan from inst),
    'max', (select max_demos_per_nacht from inst),
    'wachtend', (select n from wachtend),
    'leads', coalesce((select jsonb_agg(to_jsonb(g) order by g.kans desc) from gekozen g), '[]'::jsonb)
  );
$function$;

-- Which lead a DM sent from @qoreaesthetics belongs to: the first 120 characters (spaces normalised) equal a prepared
-- text. Returns up to 2 rows so the caller can refuse a text that fits more than one lead.
create or replace function public.lead_zoek_op_dm(p_tekst text)
returns table (lead_id uuid, welke text)
language sql
stable
security definer
set search_path = ''
as $$
  with t as (select left(regexp_replace(trim(p_tekst), '\s+', ' ', 'g'), 120) as k),
  teksten as (
    select l.id as lead_id, 'bericht' as welke, l.bericht as x, 1 as p from public.leads l
    union all select l.id, 'opvolging_1', l.opvolging_1, 2 from public.leads l
    union all select l.id, 'opvolging_2', l.opvolging_2, 3 from public.leads l
    union all select d.lead_id, 'demo', replace(d.dm_tekst, '[DEMO-LINK]', 'https://qoreaesthetics.com/demo/' || d.token), 0
      from public.demo_aanvragen d where d.lead_id is not null and d.dm_tekst is not null
  )
  select c.lead_id, c.welke from teksten c, t
  where length(t.k) >= 40 and c.x is not null
    and left(regexp_replace(trim(c.x), '\s+', ' ', 'g'), 120) = t.k
  order by c.p
  limit 2
$$;

revoke all on function public.lead_zoek_op_dm(text) from public, anon, authenticated;
grant execute on function public.lead_zoek_op_dm(text) to service_role;

-- 23:05 UTC = just after midnight in Brussels (summer and winter time), 07:05 in Bali.
select cron.schedule('leads-dag-plannen', '5 23 * * *', $$select public.leads_dag_plannen()$$);

-- Every 15 minutes: a tapped question button without an answer after 2,5 h gets its "geen antwoord" + PS
-- (Edge Function meta-webhook, the same rule as the dashboard button). Safe without a key: it only applies what the
-- clock already decides.
select cron.schedule('vraagknop-controle', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://gqigmmezcmtwusgbdxny.supabase.co/functions/v1/meta-webhook?controle=vraagknop',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  )
$$);
