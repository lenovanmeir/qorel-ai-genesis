-- AI usage per clinic, so Leno sees on his own dashboard what each clinic costs (tokens and dollars),
-- whatever provider answered (OpenAI now, Claude as reserve later). One row per AI call.

create table public.ai_verbruik (
  id             bigint generated always as identity primary key,
  clinic_id      uuid references public.clinics (id) on delete set null,  -- null for internal work (leads, texts)
  onderdeel      text not null,        -- chatbot, demo, leads, teksten, demo_controle
  kanaal         text,                 -- website, instagram, facebook, whatsapp
  leverancier    text not null default 'openai',
  model          text not null,
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  kost_usd       numeric(12, 6) not null default 0,
  op             timestamptz not null default now()
);

create index ai_verbruik_clinic_op_idx on public.ai_verbruik (clinic_id, op desc);
create index ai_verbruik_op_idx on public.ai_verbruik (op desc);

-- Only server-side code (n8n, Edge Functions) with the service role writes or reads this.
alter table public.ai_verbruik enable row level security;
grant select, insert on public.ai_verbruik to service_role;
grant usage, select on sequence public.ai_verbruik_id_seq to service_role;
