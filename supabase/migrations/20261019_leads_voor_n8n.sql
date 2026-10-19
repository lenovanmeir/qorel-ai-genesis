-- The nightly n8n workflows (Leads zoeken, Teksten klaarzetten, the copy to the sheet) read every lead.
-- A plain REST read stops at 1000 rows, so they call this function instead: one JSON value with all leads,
-- in the old sheet order, with only the columns those workflows use.
create or replace function public.leads_voor_n8n()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object('leads', coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'kliniek', kliniek, 'stad', stad, 'instagram', instagram, 'website', website, 'telefoon', telefoon,
    'email', email, 'eigenaar', eigenaar, 'linkedin', linkedin, 'kans', kans, 'waarom', waarom, 'taal', taal,
    'contact_via', contact_via, 'bericht', bericht, 'demo_link', demo_link, 'status', status,
    'opvolgen_op', opvolgen_op, 'notities', notities, 'toegevoegd', toegevoegd,
    'opnieuw_schrijven', opnieuw_schrijven, 'bron', bron, 'volgende_stap', volgende_stap, 'versie', versie,
    'opwarmen', opwarmen, 'reactie_opwarmen', reactie_opwarmen, 'opvolging_1', opvolging_1,
    'opvolging_2', opvolging_2, 'vraagknop', vraagknop, 'reactie_op_comment', reactie_op_comment, 'fase', fase
  ) order by sheet_rij asc nulls last, aangemaakt_op asc), '[]'::jsonb))
  from leads;
$$;

-- Only n8n (service role) may call it; functions are executable by everyone by default.
revoke execute on function public.leads_voor_n8n() from public, anon, authenticated;
grant execute on function public.leads_voor_n8n() to service_role;
