-- P4: the demo page invites the clinic to book a call after its 3rd message.
-- demo_uitnodiging() gives the page what it needs for that card and the Cal.com prefill; demo_uitnodiging_log()
-- records "shown" and "clicked" once per demo on the lead's timeline. Both only answer to a valid demo token
-- (32 hex characters, secret, only in the clinic's own link), so the public key can call them without seeing other rows.

create or replace function public.demo_uitnodiging(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'kliniek', d.kliniek,
    'website', coalesce(nullif(d.website, ''), l.website),
    -- Only for clinics we reached by e-mail: an Instagram lead fills in its own address.
    'email', case when coalesce(d.instagram, l.instagram, '') = '' then coalesce(nullif(d.email, ''), l.email) end,
    'max', d.max_berichten,
    'gebruikt', d.berichten_gebruikt,
    'geboekt', coalesce(l.fase in ('MEETING_BOOKED', 'MEETING_HELD', 'WON'), false)
  )
  from demo_aanvragen d
  left join leads l on l.id = d.lead_id
  where p_token ~ '^[0-9a-f]{32}$' and d.token = p_token
  limit 1;
$$;

create or replace function public.demo_uitnodiging_log(p_token text, p_soort text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  insert into lead_gebeurtenissen (lead_id, soort, kanaal, inhoud, data, bron, extern_id)
  select d.lead_id, 'demo_uitnodiging', 'demo',
         case p_soort when 'getoond' then 'Uitnodiging voor een gesprek getoond' else 'Op "Plan een gesprek" geklikt' end,
         jsonb_build_object('demo', d.id, 'actie', p_soort),
         'demo',
         'demo:' || d.id || ':' || p_soort
  from demo_aanvragen d
  where p_token ~ '^[0-9a-f]{32}$' and d.token = p_token and d.lead_id is not null
    and p_soort in ('getoond', 'geklikt')
  on conflict (extern_id) do nothing;
$$;

revoke all on function public.demo_uitnodiging(text) from public;
revoke all on function public.demo_uitnodiging_log(text, text) from public;
grant execute on function public.demo_uitnodiging(text) to anon, authenticated;
grant execute on function public.demo_uitnodiging_log(text, text) to anon, authenticated;
