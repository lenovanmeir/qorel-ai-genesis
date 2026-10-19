-- Every person who messages a clinic on Instagram, Facebook or WhatsApp becomes one customer per clinic,
-- recognised by the channel and the id Meta gives them (Instagram-scoped id, page-scoped id or phone number).
alter table public.customers
  add column if not exists kanaal text check (kanaal in ('website', 'instagram', 'facebook', 'whatsapp')),
  add column if not exists extern_id text,
  add column if not exists gebruikersnaam text,
  add column if not exists laatst_gezien_op timestamptz;

create unique index if not exists customers_kliniek_kanaal_extern
  on public.customers (clinic_id, kanaal, extern_id);
