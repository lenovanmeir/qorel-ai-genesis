-- The dashboard's Demo's tab shows per demo what Leno also gets on Telegram.
-- dm_tekst: the Instagram message Claude wrote for this clinic (empty = standard text on the dashboard).
-- controle: result of the 5 test questions the builder asks after every build.
-- dm_verstuurd_op: set by the "DM verstuurd" button on the dashboard.
alter table public.demo_aanvragen
  add column if not exists dm_tekst text,
  add column if not exists controle jsonb,
  add column if not exists dm_verstuurd_op timestamptz;
