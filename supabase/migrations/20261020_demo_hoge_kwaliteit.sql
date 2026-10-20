-- A demo that answered all 5 test questions and knows more than 10 treatments is "Hoge kwaliteit": it can be
-- approved in one batch from the dashboard. One rule in the database, so the dashboard and Telegram agree.
alter table public.demo_aanvragen
  add column if not exists hoge_kwaliteit boolean generated always as (
    coalesce((controle->>'totaal')::int = 5 and (controle->>'ok')::int = 5 and (controle->>'behandelingen')::int > 10, false)
  ) stored;
