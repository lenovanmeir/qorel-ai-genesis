-- P2: each night (05:00 Bali) n8n builds demos in advance for the best new leads, so Leno only has to review them.
-- The switch and the nightly maximum live next to the other lead-finder settings.
alter table public.zoeker_instellingen
  add column if not exists demo_vooraf_aan boolean not null default true,
  add column if not exists max_demos_per_nacht integer not null default 5
    check (max_demos_per_nacht between 0 and 20);

-- The leads that get a demo tonight: chance >= 70, a website, Instagram or e-mail, not contacted yet, no demo yet.
-- Best chance first. One JSON value, so the REST row limit never applies.
create or replace function public.leads_voor_demo()
returns jsonb
language sql
stable
set search_path = public
as $$
  with inst as (select demo_vooraf_aan, max_demos_per_nacht from zoeker_instellingen where id = 1),
  gekozen as (
    select l.id, l.kliniek, l.stad, l.instagram, l.email, l.website, l.telefoon, l.taal, l.contact_via, l.kans, l.bericht
    from leads l
    where l.kans >= 70
      and coalesce(trim(l.website), '') <> ''
      and (coalesce(trim(l.instagram), '') <> '' or coalesce(trim(l.email), '') <> '')
      and l.status in ('Nieuw', 'Opwarmen', 'Klaar om te sturen')
      and l.fase in ('NEW', 'QUALIFIED', 'WARMING')
      and not exists (select 1 from demo_aanvragen d where d.lead_id = l.id)
    order by l.kans desc, l.aangemaakt_op asc
    limit (select case when demo_vooraf_aan then max_demos_per_nacht else 0 end from inst)
  )
  select jsonb_build_object(
    'aan', (select demo_vooraf_aan from inst),
    'max', (select max_demos_per_nacht from inst),
    'leads', coalesce((select jsonb_agg(to_jsonb(g) order by g.kans desc) from gekozen g), '[]'::jsonb)
  );
$$;

revoke execute on function public.leads_voor_demo() from public, anon, authenticated;
grant execute on function public.leads_voor_demo() to service_role;
