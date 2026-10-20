-- Qore Aesthetics as its own "clinic": the AI receptionist on @qoreaesthetics (and later the website) answers
-- questions about Qore Aesthetics itself, with Leno's packages and prices (approved by Leno on 20/10).
-- Package contents beyond what is listed here are not invented: the AI refers to a call with Leno.

insert into public.clinics (id, name, slug, website_url, timezone, is_active, is_klant)
values ('a0e5a000-0000-4000-a000-000000000001', 'Qore Aesthetics', 'qore-aesthetics', 'https://qoreaesthetics.com', 'Europe/Brussels', true, false)
on conflict (id) do nothing;

insert into public.services (id, clinic_id, name, slug, description, is_active) values
  ('a0e5a000-0000-4000-a002-000000000001', 'a0e5a000-0000-4000-a000-000000000001', 'Pakket Start', 'start',
   'AI-receptioniste voor een esthetische kliniek: beantwoordt vragen van patiënten 24/7 in het Nederlands, Frans en Engels met de info van de kliniek, en stuurt door naar de agenda.', true),
  ('a0e5a000-0000-4000-a002-000000000002', 'a0e5a000-0000-4000-a000-000000000001', 'Pakket Groei', 'groei',
   'Alles van Start, plus elke maand een opvolggesprek van 15 minuten met Leno.', true),
  ('a0e5a000-0000-4000-a002-000000000003', 'a0e5a000-0000-4000-a000-000000000001', 'Pakket Compleet', 'compleet',
   'Alles van Groei, plus WhatsApp, 1.200 gesprekken per maand, een maandelijks gesprek van 30 minuten, elk kwartaal een strategiegesprek van 1 uur, en voorrang bij aanpassingen met antwoord dezelfde dag.', true)
on conflict (id) do nothing;

insert into public.service_prices (service_id, name, price_amount, currency_code, is_from_price, is_active) values
  ('a0e5a000-0000-4000-a002-000000000001', 'Per maand, maandelijks opzegbaar', 239, 'EUR', false, true),
  ('a0e5a000-0000-4000-a002-000000000001', 'Opstart bij maandelijks opzegbaar', 950, 'EUR', false, true),
  ('a0e5a000-0000-4000-a002-000000000001', 'Per maand, met jaarcontract', 199, 'EUR', false, true),
  ('a0e5a000-0000-4000-a002-000000000001', 'Opstart bij jaarcontract', 700, 'EUR', false, true),
  ('a0e5a000-0000-4000-a002-000000000002', 'Per maand, maandelijks opzegbaar', 419, 'EUR', false, true),
  ('a0e5a000-0000-4000-a002-000000000002', 'Opstart bij maandelijks opzegbaar', 1450, 'EUR', false, true),
  ('a0e5a000-0000-4000-a002-000000000002', 'Per maand, met jaarcontract', 349, 'EUR', false, true),
  ('a0e5a000-0000-4000-a002-000000000002', 'Opstart bij jaarcontract', 1200, 'EUR', false, true),
  ('a0e5a000-0000-4000-a002-000000000003', 'Per maand, maandelijks opzegbaar', 659, 'EUR', false, true),
  ('a0e5a000-0000-4000-a002-000000000003', 'Opstart bij maandelijks opzegbaar', 1950, 'EUR', false, true),
  ('a0e5a000-0000-4000-a002-000000000003', 'Per maand, met jaarcontract', 549, 'EUR', false, true),
  ('a0e5a000-0000-4000-a002-000000000003', 'Opstart bij jaarcontract', 1700, 'EUR', false, true),
  ('a0e5a000-0000-4000-a002-000000000003', 'Extra (vierde) taal, eenmalig', 250, 'EUR', false, true);

insert into public.knowledge_documents (clinic_id, title, category, content, is_verified, is_active) values
  ('a0e5a000-0000-4000-a000-000000000001', 'Wat is Qore Aesthetics', 'general',
   'Qore Aesthetics bouwt een AI-receptioniste voor esthetische klinieken in België en Nederland. Ze beantwoordt vragen van patiënten dag en nacht op Instagram, Facebook, de website en (in Compleet) WhatsApp, in het Nederlands, Frans en Engels, met de echte info van de kliniek: behandelingen, prijzen, adres en openingsuren. Afspraken stuurt ze naar de agenda van de kliniek. Medische vragen en klachten gaan altijd naar een medewerker. Qore Aesthetics is een merk van QoreLabs; oprichter is Leno.', true, true),
  ('a0e5a000-0000-4000-a000-000000000001', 'Gratis demo', 'general',
   'Elke kliniek kan gratis een demo krijgen: een receptioniste die al werkt met de info van haar eigen website, om zelf uit te testen. Vraag een demo aan via qoreaesthetics.com of stuur "DEMO" in een DM.', true, true),
  ('a0e5a000-0000-4000-a000-000000000001', 'Live binnen 4 werkdagen', 'general',
   'De receptioniste staat live binnen 4 werkdagen, anders wordt de opstartkost terugbetaald. De termijn start zodra de volledige intake, de betaling en de toegang tot de kanalen binnen zijn, en pauzeert zolang we wachten op goedkeuring of antwoorden van de kliniek.', true, true),
  ('a0e5a000-0000-4000-a000-000000000001', 'Contract en betaling', 'pricing',
   'Er zijn drie pakketten: Start, Groei en Compleet. Je kiest maandelijks opzegbaar of een jaarcontract; het jaarcontract is ongeveer 17% goedkoper per maand en wordt maandelijks betaald, nooit vooraf. Een jaarcontract loopt tot het einde van de termijn. Nederlands, Frans en Engels zijn inbegrepen; een vierde taal kost eenmalig €250.', true, true),
  ('a0e5a000-0000-4000-a000-000000000001', 'Gesprek met Leno', 'general',
   'Wie wil weten welk pakket past, of meteen wil starten, plant een gratis kennismakingsgesprek van 20 minuten met Leno via de agenda.', true, true);

insert into public.business_rules (clinic_id, title, category, rule_text, priority, is_active) values
  ('a0e5a000-0000-4000-a000-000000000001', 'Geen verzonnen informatie', 'response_policy',
   'Geef alleen informatie die in de kennis van Qore Aesthetics staat. Verzin geen klanten, resultaten, cijfers, kortingen of pakketinhoud. Weet je iets niet, stel dan een gesprek met Leno voor.', 10, true),
  ('a0e5a000-0000-4000-a000-000000000001', 'Prijzen mogen genoemd worden', 'pricing_policy',
   'Je mag de maandprijzen en opstartkosten van Start, Groei en Compleet noemen, voor maandelijks opzegbaar en voor een jaarcontract.', 20, true),
  ('a0e5a000-0000-4000-a000-000000000001', 'Doel van elk gesprek', 'response_policy',
   'Help de kliniek verder en nodig waar het past uit voor een gratis demo of een gesprek van 20 minuten met Leno. Blijf kort, vriendelijk en zakelijk.', 30, true);

insert into public.handoff_rules (clinic_id, title, category, trigger_condition, handoff_type, priority, is_active) values
  ('a0e5a000-0000-4000-a000-000000000001', 'Vraag om Leno of een mens', 'service',
   'De persoon vraagt expliciet om Leno, een mens, of wil onderhandelen over prijs of contract.', 'INTENTIONAL', 10, true),
  ('a0e5a000-0000-4000-a000-000000000001', 'Bestaande klant met probleem', 'complaint',
   'Een bestaande klant meldt een fout, klacht of betalingsprobleem.', 'INTENTIONAL', 20, true);

insert into public.chat_keuzes (clinic_id, code, positie, label_nl, label_fr, label_en, actie, vraag_nl, vraag_fr, vraag_en, is_actief) values
  ('a0e5a000-0000-4000-a000-000000000001', 'PRIJZEN', 1, '💰 Prijzen', '💰 Tarifs', '💰 Prices', 'vraag',
   'Wat kosten jullie pakketten?', 'Combien coûtent vos formules ?', 'How much do your packages cost?', true),
  ('a0e5a000-0000-4000-a000-000000000001', 'DEMO', 2, '🤖 Gratis demo', '🤖 Démo gratuite', '🤖 Free demo', 'vraag',
   'Hoe krijg ik een gratis demo voor mijn kliniek?', 'Comment obtenir une démo gratuite pour ma clinique ?', 'How do I get a free demo for my clinic?', true),
  ('a0e5a000-0000-4000-a000-000000000001', 'GESPREK', 3, '📅 Gesprek', '📅 Appel', '📅 Book a call', 'agenda',
   'Ik wil een gesprek plannen met Leno.', 'Je voudrais planifier un appel avec Leno.', 'I would like to book a call with Leno.', true);

-- Each clinic can have its own calendar; the n8n workflow uses it instead of the fixed demo calendar.
alter table public.clinics add column if not exists kalender jsonb;
update public.clinics set kalender = jsonb_build_object(
  'actief', true, 'type', 'boekingslink', 'naam', 'Kennismaking met Leno',
  'boekingslink', 'https://cal.com/leno-qore/qore-aesthetics', 'telefoon', '', 'afspraakduur_minuten', 20)
where id = 'a0e5a000-0000-4000-a000-000000000001';
