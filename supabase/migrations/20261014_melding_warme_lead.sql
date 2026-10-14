-- Leno gets a Telegram message within a minute when a clinic uses its demo or books a call,
-- because speed of follow-up decides whether a warm lead turns into a call.
-- The database pings the Edge Function "melding" with only the event id. The function itself checks that the
-- event is real, recent and not yet reported, so the call needs no secret stored in the database.

create extension if not exists pg_net with schema extensions;

create or replace function public.lead_melding_sturen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.soort = 'fase' and new.data ->> 'naar' in ('DEMO_USED', 'MEETING_BOOKED') then
    begin
      perform net.http_post(
        url := 'https://gqigmmezcmtwusgbdxny.supabase.co/functions/v1/melding',
        body := jsonb_build_object('gebeurtenis', new.id),
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
    exception when others then
      -- A failed notification must never block the stage change itself.
      raise warning 'lead_melding_sturen: %', sqlerrm;
    end;
  end if;
  return null;
end $$;

drop trigger if exists lead_melding_sturen on public.lead_gebeurtenissen;
create trigger lead_melding_sturen after insert on public.lead_gebeurtenissen
for each row execute function public.lead_melding_sturen();
