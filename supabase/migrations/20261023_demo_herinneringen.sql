-- Process plan P3 (23/10): demo reminders. A demo DM that got no use gets two reminders on the dashboard (day 3 and
-- day 7 after the DM), with a fixed text and the demo link; Leno sends them, the Instagram echo or his button marks
-- them here. They stop by themselves once the clinic used the demo or answered.
alter table public.demo_aanvragen
  add column if not exists herinnering_1_op timestamptz,
  add column if not exists herinnering_2_op timestamptz;
