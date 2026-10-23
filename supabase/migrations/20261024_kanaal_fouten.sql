-- Every failed send or profile call from the Edge Function "kanaal": what Meta answered, per channel. With this a
-- refused token (401 / code 190) is visible in the database at once, not only in the function logs, and Leno gets a
-- Telegram message right away instead of at the nightly check. Only the server reads and writes this table.

create table if not exists public.kanaal_fouten (
  id uuid primary key default gen_random_uuid(),
  kanaal_id uuid references public.clinic_channels (id) on delete cascade,
  channel text not null,
  account_id text not null,
  actie text not null check (actie in ('bericht', 'profiel')),
  http_status int not null,
  meta_code int,
  meta_subcode int,
  bericht text,
  token_geweigerd boolean not null default false,
  aangemaakt_op timestamptz not null default now()
);

create index if not exists kanaal_fouten_kanaal_op on public.kanaal_fouten (kanaal_id, aangemaakt_op desc);

alter table public.kanaal_fouten enable row level security;
revoke all on public.kanaal_fouten from anon, authenticated;
