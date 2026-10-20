-- Leno, 20/10: the AI quotes Qore Aesthetics prices without mentioning VAT (decided after first adding
-- "exclusief btw"); invoicing questions are handled by Leno.
update public.knowledge_documents set content = replace(content, ' Alle genoemde prijzen zijn exclusief btw.', '')
where clinic_id = 'a0e5a000-0000-4000-a000-000000000001' and title = 'Contract en betaling';

update public.business_rules set rule_text = 'Je mag de maandprijzen en opstartkosten van Start, Groei en Compleet noemen, voor maandelijks opzegbaar en voor een jaarcontract.'
where clinic_id = 'a0e5a000-0000-4000-a000-000000000001' and title = 'Prijzen mogen genoemd worden';
