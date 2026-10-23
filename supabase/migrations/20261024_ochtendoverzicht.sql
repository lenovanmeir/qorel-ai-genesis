-- Process plan (24/10): one Telegram morning overview at 07:30 Bali (23:30 UTC) instead of separate night messages.
-- Applied with execute_sql on 24/10; kept here so the schedule is in the repo.
select cron.schedule('ochtendoverzicht', '30 23 * * *', $$
  select net.http_post(
    url := 'https://gqigmmezcmtwusgbdxny.supabase.co/functions/v1/ochtendoverzicht',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  )
$$);
