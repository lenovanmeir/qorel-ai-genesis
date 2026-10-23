-- Process plan P3 (24/10): the dashboard's "Klant wil starten" link carries the lead's id (Stripe
-- client_reference_id). The onboarding function stores it here and marks that lead as client.
alter table public.onboardingen
  add column if not exists lead_id uuid references public.leads (id) on delete set null;
