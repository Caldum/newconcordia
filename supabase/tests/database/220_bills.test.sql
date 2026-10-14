-- G4: bills, initiative limits, quorum and majorities, budget escrow, atomic execution or approved-but-not-executed,
-- the vice president's tie-break and decrees (spec sections 2, 3 and 12.5, ADR 0027).
begin;
create extension if not exists pgtap with schema extensions;
select plan(60);

create function pg_temp.new_player(p_email text, p_name text, p_country text, p_xp bigint)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at,
                          updated_at, last_sign_in_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
          jsonb_build_object('citizen_name', p_name, 'country_code', p_country, 'locale', 'es'),
          now(), now(), now(), '2026-11-07 09:00+00')
  returning id into v_id;
  perform game.add_civil_xp(v_id, p_xp);
  return v_id;
end;
$$;

create function pg_temp.act_as(p_user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

create function pg_temp.at(p_at text)
returns void
language sql
as $$
  select set_config('game.fixed_now', p_at, true);
$$;

create function pg_temp.treasury(p_country text)
returns bigint
language sql
as $$
  select balance from game.accounts where kind = 'treasury' and country_code = p_country and currency_code = 'GOLD';
$$;

create function pg_temp.status(p_title text)
returns text
language sql
as $$
  select status from game.bills where title = p_title;
$$;

select pg_temp.at('2026-11-07 10:00:00+00');
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, 'ARG-01') where code in ('ARG', 'BRA', 'URY');

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG', 22500) as camila \gset
select pg_temp.new_player('lucia@example.com', 'Lucía Paz', 'ARG', 22500) as lucia \gset
select pg_temp.new_player('pedro@example.com', 'Pedro Gil', 'ARG', 10000) as pedro \gset
select pg_temp.new_player('sofia@example.com', 'Sofía Díaz', 'ARG', 22500) as sofia \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG', 10000) as juan \gset
select pg_temp.new_player('elena@example.com', 'Elena Sosa', 'ARG', 10000) as elena \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG', 22500) as marcos \gset
select pg_temp.new_player('raul@example.com', 'Raúl Ortiz', 'ARG', 11000) as raul \gset
select pg_temp.new_player('tomas@example.com', 'Tomás Luna', 'ARG', 10000) as tomas \gset

-- A government: president, vice president, an Economy minister, the governor and four members of Congress. -------
insert into game.parties (country_code, name, founder_user_id, leader_user_id, founded_at)
values ('ARG', 'Frente Federal', :'camila', :'camila', game.now()) returning id as frente \gset
insert into game.party_memberships (user_id, party_id, joined_at)
select u, :'frente', game.now() from unnest(array[:'camila', :'lucia', :'elena', :'marcos', :'raul', :'tomas']::uuid[]) as u;
insert into game.offices (country_code, office, user_id) values
  ('ARG', 'president', :'camila'), ('ARG', 'vice_president', :'lucia'),
  ('ARG', 'minister_economy', :'pedro'), ('ARG', 'central_bank_governor', :'sofia');
insert into game.mandates (country_code, office, user_id, party_id, began_at) values
  ('ARG', 'president', :'camila', :'frente', game.now()), ('ARG', 'vice_president', :'lucia', :'frente', game.now()),
  ('ARG', 'minister_economy', :'pedro', null, game.now()), ('ARG', 'central_bank_governor', :'sofia', null, game.now()),
  ('ARG', 'congress', :'elena', :'frente', game.now()), ('ARG', 'congress', :'marcos', :'frente', game.now()),
  ('ARG', 'congress', :'raul', :'frente', game.now()), ('ARG', 'congress', :'tomas', :'frente', game.now());

-- 100 GOLD in the Treasury.
select game.post('test_treasury', null, null, array[row(game.system_account('issuer', 'GOLD'),
                 game.treasury_account('ARG', 'GOLD'), 10000, 'election_reward', null)::game.ledger_leg]);

-- Initiative. ------------------------------------------------------------------------------------------------------
select pg_temp.act_as(:'lucia');
select throws_ok($$ select public.propose_bill('ordinary', 'Ley del vice', '', '{}', null) $$, '42501', 'no_initiative',
                 'the vice president has no initiative');
reset role;
select pg_temp.act_as(:'sofia');
select throws_ok($$ select public.propose_bill('ordinary', 'Ley del banco', '', '{}', null) $$, '42501', 'no_initiative',
                 'nor the governor');
reset role;
select pg_temp.act_as(:'juan');
select throws_ok($$ select public.propose_bill('ordinary', 'Ley de Juan', '', '{}', null) $$, '42501', 'no_initiative',
                 'nor a citizen without office');
reset role;

select pg_temp.act_as(:'pedro');
select lives_ok($$ select public.propose_bill('ordinary', 'Ley de Pedro', 'Texto.', '{}', null) $$, 'a minister presents a bill');
select throws_ok($$ select public.propose_bill('ordinary', 'Otra de Pedro', '', '{}', null) $$, '22023', 'initiative_exhausted',
                 'and only one per term');
reset role;

select pg_temp.act_as(:'elena');
select throws_ok($$ select public.propose_bill('ordinary', 'no', '', '{}', null) $$, '22023', 'bill_title_invalid', 'a title of 3 to 120');
select throws_ok($$ select public.propose_bill('war', 'Ley de guerra', '', '{}', null) $$, '22023', 'bill_kind_invalid', 'known kinds only');
select throws_ok($$ select public.propose_bill('taxes', 'IVA alto', '', '{"vat": 0.3}', null) $$, '22023', 'bill_terms_invalid',
                 'VAT within its legal range');
select throws_ok($$ select public.propose_bill('taxes', 'Impuesto nuevo', '', '{"luxury": 0.1}', null) $$, '22023',
                 'bill_terms_invalid', 'known taxes only');
select throws_ok($$ select public.propose_bill('taxes', 'Sin cambios', '', '{}', null) $$, '22023', 'bill_terms_invalid',
                 'a tax bill changes something');
select lives_ok($$ select public.propose_bill('taxes', 'IVA al 7 %', '', '{"vat": 0.07, "minimum_wage": 500}', null) $$,
                'a member of Congress presents a tax bill');
select lives_ok($$ select public.propose_bill('ordinary', 'Día del trabajo', '', '{}', null) $$, 'a second');
select lives_ok($$ select public.propose_bill('ordinary', 'Día de la bandera', '', '{}', null) $$, 'and a third');
select throws_ok($$ select public.propose_bill('ordinary', 'Una cuarta', '', '{}', null) $$, '22023', 'initiative_exhausted',
                 'three per term');
reset role;
select pg_temp.act_as(:'elena');
select results_eq($$ select office, used, allowed from public.get_my_initiative() $$,
                  $$ values ('congress', 3, 3) $$, 'the member sees their allowance');
reset role;

-- Budget escrow from presentation. -----------------------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select throws_ok($$ select public.propose_bill('gold_transfer', 'Ayuda a Argentina', '', '{"country_code": "ARG", "amount": 100}', null) $$,
                 '22023', 'country_invalid', 'not to its own Treasury');
select throws_ok($$ select public.propose_bill('gold_transfer', 'Ayuda grande', '', '{"country_code": "BRA", "amount": 15000}', null) $$,
                 '22023', 'insufficient_funds', 'never more than the Treasury holds');
select lives_ok($$ select public.propose_bill('gold_transfer', 'Ayuda a Brasil', '', '{"country_code": "BRA", "amount": 4000}',
                                              '00000000-0000-0000-0000-0000000000b1') $$,
                'the president presents a transfer');
select public.propose_bill('gold_transfer', 'Ayuda a Brasil', '', '{"country_code": "BRA", "amount": 4000}',
                           '00000000-0000-0000-0000-0000000000b1') as again \gset
select lives_ok($$ select public.propose_bill('gold_transfer', 'Ayuda a Uruguay', '', '{"country_code": "URY", "amount": 2000}', null) $$,
                'a second transfer');
select lives_ok($$ select public.propose_bill('gold_transfer', 'Ayuda rechazada', '', '{"country_code": "BRA", "amount": 1000}', null) $$,
                'and a third');
reset role;
select id as iva from game.bills where title = 'IVA al 7 %' \gset
select id as pedro_bill from game.bills where title = 'Ley de Pedro' \gset
select id as trabajo from game.bills where title = 'Día del trabajo' \gset
select id as bandera from game.bills where title = 'Día de la bandera' \gset
select id as brasil from game.bills where title = 'Ayuda a Brasil' \gset
select id as uruguay from game.bills where title = 'Ayuda a Uruguay' \gset
select id as rechazada from game.bills where title = 'Ayuda rechazada' \gset
select is(:'again'::bigint, :'brasil'::bigint, 'a repeated key returns the same bill');
select is(pg_temp.treasury('ARG'), 3000::bigint, 'the Treasury keeps only what is not locked');
select pg_temp.act_as(:'camila');
select throws_ok($$ select public.propose_bill('gold_transfer', 'Ayuda doble', '', '{"country_code": "BRA", "amount": 4000}', null) $$,
                 '22023', 'insufficient_funds', 'locked money cannot be promised twice');
reset role;
select is((select members from game.bills where title = 'Ayuda a Brasil'), 4, 'the bill counts over the four occupied seats');

-- Votes and tie-breaks. --------------------------------------------------------------------------------------------
select pg_temp.act_as(:'juan');
select throws_ok(format('select public.vote_bill(%s, %L)', :'iva', 'yes'),
                 '42501', 'not_in_congress', 'only members of Congress vote');
reset role;

-- IVA al 7 %: 2 yes, 1 no, 1 abstention. Ley de Pedro: 1–1 with the vice president's yes. Día del trabajo: 1–1, no
-- tie-break. Día de la bandera: two votes of four seats, no quorum. Transfers: 3 yes; the rejected one 3 no.
select pg_temp.act_as(:'elena');
select public.vote_bill(id, 'yes') from unnest(array[:'iva', :'pedro_bill', :'trabajo', :'bandera', :'brasil', :'uruguay']::bigint[]) as id;
select public.vote_bill(:'rechazada', 'no');
select throws_ok(format('select public.vote_bill(%s, %L)', :'iva', 'no'),
                 '22023', 'already_voted', 'one vote per member');
select throws_ok(format('select public.vote_bill(%s, %L)', :'trabajo', 'maybe'),
                 '22023', 'choice_invalid', 'yes, no or abstain');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote_bill(id, 'yes') from unnest(array[:'iva', :'bandera', :'brasil', :'uruguay']::bigint[]) as id;
select public.vote_bill(id, 'no') from unnest(array[:'pedro_bill', :'trabajo', :'rechazada']::bigint[]) as id;
reset role;
select pg_temp.act_as(:'raul');
select public.vote_bill(id, 'no') from unnest(array[:'iva', :'rechazada']::bigint[]) as id;
select public.vote_bill(id, 'yes') from unnest(array[:'brasil', :'uruguay']::bigint[]) as id;
select public.vote_bill(id, 'abstain') from unnest(array[:'pedro_bill', :'trabajo']::bigint[]) as id;
reset role;
select pg_temp.act_as(:'tomas');
select public.vote_bill(id, 'abstain') from unnest(array[:'iva', :'pedro_bill', :'trabajo']::bigint[]) as id;
reset role;

select pg_temp.act_as(:'marcos');
select throws_ok(format('select public.break_tie(%s, %L)', :'pedro_bill', 'yes'),
                 '42501', 'not_vice_president', 'only the vice president breaks ties');
reset role;
select pg_temp.act_as(:'lucia');
select throws_ok(format('select public.break_tie(%s, %L)', :'pedro_bill', 'abstain'),
                 '22023', 'choice_invalid', 'a tie-break is yes or no');
select lives_ok(format('select public.break_tie(%s, %L)', :'pedro_bill', 'yes'),
                'the vice president casts a tie-break');
select throws_ok(format('select public.break_tie(%s, %L)', :'pedro_bill', 'no'),
                 '22023', 'already_voted', 'and cannot change it');
select throws_ok(format('select public.vote_bill(%s, %L)', :'pedro_bill', 'yes'),
                 '42501', 'not_in_congress', 'nor vote ordinarily');
reset role;

-- Uruguay leaves the game before the count: its transfer cannot run.
update game.countries set is_active = false where code = 'URY';

-- The count, 24 hours later. -----------------------------------------------------------------------------------------
select pg_temp.at('2026-11-08 09:59:00+00');
select is(game.close_bill(:'iva'), 'voting', 'nothing is counted before 24 hours');
select pg_temp.at('2026-11-08 10:05:00+00');
select is((game.job_elections('2026-11-08 10:05:00+00') ->> 'bills')::integer, 7, 'the hourly job closes every bill');

select is(pg_temp.status('IVA al 7 %'), 'executed', 'quorum and more yes than no: approved and executed');
select is((select vat from game.country_policies where country_code = 'ARG'), 0.07, 'VAT is now 7 %');
select is((select minimum_wage from game.country_policies where country_code = 'ARG'), 500::bigint, 'and the minimum wage 5');
select is(pg_temp.status('Ley de Pedro'), 'executed', 'a tie goes to the vice president');
select is(pg_temp.status('Día del trabajo'), 'rejected', 'a tie without tie-break is rejected');
select is(pg_temp.status('Día de la bandera'), 'rejected', 'without quorum nothing passes');
select is(pg_temp.status('Ayuda a Brasil'), 'executed', 'the transfer is executed');
select is(pg_temp.treasury('BRA'), 4000::bigint, 'and the GOLD reaches Brazil''s Treasury');
select results_eq(
  $$ select status, failure from game.bills where title = 'Ayuda a Uruguay' $$,
  $$ values ('not_executed', 'country_inactive') $$,
  'an approved bill that cannot run is kept as approved but not executed'
);
select is(pg_temp.status('Ayuda rechazada'), 'rejected', 'the third transfer is rejected');
select is(pg_temp.treasury('ARG'), 6000::bigint, 'rejection and failure return their funds; the executed one is spent');
select is(
  (select count(*)::integer from game.ledger_holds as h join game.bill_reservations as r on r.hold_id = h.id where h.status = 'open'),
  0,
  'no reservation stays open'
);
select pg_temp.act_as(:'elena');
select throws_ok(format('select public.vote_bill(%s, %L)', :'pedro_bill', 'no'),
                 '22023', 'voting_closed', 'no votes after the count');
reset role;
select results_eq(
  $$ select title, yes, no, abstain, tiebreak from public.list_bills('ARG') where title = 'Ley de Pedro' $$,
  $$ values ('Ley de Pedro', 1, 1, 2, 'yes') $$,
  'the count and the tie-break are public'
);
select is((select count(*)::integer from public.list_bill_votes(:'iva')), 4,
          'so is the roll call');

-- The vice president also breaks a tie on the president's resignation. ----------------------------------------------
select pg_temp.act_as(:'camila');
select public.request_resignation() as motion \gset
reset role;
select pg_temp.act_as(:'elena');
select public.vote_motion(:'motion', 'yes');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote_motion(:'motion', 'no');
reset role;
select pg_temp.act_as(:'raul');
select public.vote_motion(:'motion', 'abstain');
reset role;
select pg_temp.act_as(:'lucia');
select lives_ok(format('select public.break_motion_tie(%s, %L)', :'motion', 'yes'), 'the vice president breaks the tie');
reset role;
select pg_temp.at('2026-11-09 10:10:00+00');
select is(game.close_motion(:'motion'), 'approved', 'the resignation is accepted');
select is((select c.name from game.offices as o join game.citizens as c on c.user_id = o.user_id
           where o.country_code = 'ARG' and o.office = 'president'), 'Lucía Paz', 'and the vice president succeeds');

-- Decrees. ---------------------------------------------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select throws_ok($$ select public.issue_decree('Decreto 1', 'Texto.', null) $$, '42501', 'not_president', 'only the president decrees');
reset role;
select pg_temp.act_as(:'lucia');
select throws_ok($$ select public.issue_decree('D', 'Texto.', null) $$, '22023', 'decree_invalid', 'a decree needs a title');
select lives_ok($$ select public.issue_decree('Decreto 1', 'Se establece el día del ciudadano.', null) $$, 'the president decrees');
reset role;
select results_eq($$ select title, issued_by_name from public.list_decrees('ARG') $$, $$ values ('Decreto 1', 'Lucía Paz') $$,
                  'decrees are public');

-- Money and privileges. ----------------------------------------------------------------------------------------------
select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);
select ok(not has_function_privilege('anon', 'public.propose_bill(text, text, text, jsonb, uuid)', 'EXECUTE'), 'visitors present nothing');
select ok(has_function_privilege('anon', 'public.list_bills(text)', 'EXECUTE'), 'but read the bills');
select ok(not has_table_privilege('authenticated', 'game.bills', 'SELECT'), 'bills are read through functions');

select * from finish();
rollback;
