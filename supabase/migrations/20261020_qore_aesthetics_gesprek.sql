-- Asking for a call with Leno is a booking (calendar link), not a hand-off to a person (which pauses the AI).
update public.handoff_rules set title = 'Vraag om een mens in de chat',
  trigger_condition = 'De persoon vraagt expliciet om een mens of medewerker in deze chat, of wil onderhandelen over prijs of contract. Een gesprek of call plannen met Leno is GEEN overdracht maar een afspraakvraag (BOOKING_REQUEST).'
where clinic_id = 'a0e5a000-0000-4000-a000-000000000001' and title = 'Vraag om Leno of een mens';

insert into public.business_rules (clinic_id, title, category, rule_text, priority, is_active) values
  ('a0e5a000-0000-4000-a000-000000000001', 'Gesprek plannen = afspraak', 'booking_policy',
   'Wil iemand een gesprek, call of kennismaking met Leno plannen, behandel dat als afspraakvraag (BOOKING_REQUEST). Antwoord met één korte, warme zin, bijvoorbeeld: "Graag! Een gratis kennismaking met Leno duurt 20 minuten." Noem zelf geen link en zeg niets over een agenda of link: het systeem voegt de agendalink er zelf onder toe. Vraag niet naar behandeling of vestiging.', 15, true);
