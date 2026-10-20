-- Leno, 20/10: every price Qore Aesthetics quotes is excluding VAT (B2B), and the AI says so.
update public.knowledge_documents set content = content || ' Alle genoemde prijzen zijn exclusief btw.'
where clinic_id = 'a0e5a000-0000-4000-a000-000000000001' and title = 'Contract en betaling' and content not like '%exclusief btw%';

update public.business_rules set rule_text = 'Je mag de maandprijzen en opstartkosten van Start, Groei en Compleet noemen, voor maandelijks opzegbaar en voor een jaarcontract. Zeg er altijd bij dat de prijzen exclusief btw zijn.'
where clinic_id = 'a0e5a000-0000-4000-a000-000000000001' and title = 'Prijzen mogen genoemd worden';
