-- Channel tokens (Instagram, Facebook, WhatsApp) live in Supabase instead of one n8n credential per clinic.
-- The token itself sits encrypted in Vault; clinic_channels only keeps a pointer to it plus its state, so the
-- nightly Edge Function "tokens-verversen" can refresh Instagram tokens before their 60 days run out and warn
-- Leno on Telegram when a channel has to be reconnected.

alter table public.clinic_channels
  add column if not exists token_secret_id uuid,
  add column if not exists token_verloopt_op timestamptz,   -- null = does not expire (FB page / WA system user)
  add column if not exists token_ververst_op timestamptz,
  add column if not exists token_status text not null default 'ontbreekt'
    check (token_status in ('ontbreekt', 'ok', 'fout')),
  add column if not exists token_fout text,
  add column if not exists token_gemeld_op timestamptz;

comment on column public.clinic_channels.token_secret_id is 'vault.secrets id of the channel access token; never the token itself';

-- Store or replace a channel's token. Only the Edge Functions (service role) may call this.
create or replace function public.kanaal_token_zetten(p_kanaal_id uuid, p_token text, p_verloopt_op timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret uuid;
  v_naam text := 'kanaal_token_' || p_kanaal_id::text;
begin
  if coalesce(trim(p_token), '') = '' then
    raise exception 'leeg token';
  end if;

  select token_secret_id into v_secret from public.clinic_channels where id = p_kanaal_id;
  if not found then
    raise exception 'kanaal % bestaat niet', p_kanaal_id;
  end if;

  if v_secret is null then
    v_secret := vault.create_secret(trim(p_token), v_naam, 'Access token van clinic_channels ' || p_kanaal_id::text);
  else
    perform vault.update_secret(v_secret, trim(p_token), v_naam);
  end if;

  update public.clinic_channels
     set token_secret_id = v_secret,
         token_verloopt_op = p_verloopt_op,
         token_ververst_op = now(),
         token_status = 'ok',
         token_fout = null,
         token_gemeld_op = null
   where id = p_kanaal_id;
end;
$$;

-- Read a channel's token. Only the Edge Functions (service role) may call this.
create or replace function public.kanaal_token_lezen(p_kanaal_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.decrypted_secret
    from public.clinic_channels c
    join vault.decrypted_secrets s on s.id = c.token_secret_id
   where c.id = p_kanaal_id;
$$;

revoke all on function public.kanaal_token_zetten(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.kanaal_token_lezen(uuid) from public, anon, authenticated;
grant execute on function public.kanaal_token_zetten(uuid, text, timestamptz) to service_role;
grant execute on function public.kanaal_token_lezen(uuid) to service_role;

-- Every night at 03:15 UTC: refresh Instagram tokens that expire within 30 days and warn about broken ones.
-- The call needs no key: the function only refreshes what is due, so an extra call changes nothing.
select cron.schedule(
  'tokens-verversen',
  '15 3 * * *',
  $$select net.http_post(
      url := 'https://gqigmmezcmtwusgbdxny.supabase.co/functions/v1/tokens-verversen',
      body := '{"nacht": true}'::jsonb,
      headers := '{"Content-Type": "application/json"}'::jsonb
    )$$
);
