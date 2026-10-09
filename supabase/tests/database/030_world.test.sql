-- D03: countries, regions and owners. Acceptance: 13 active countries and 78 regions, each with an owner.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- Acceptance test from the GDD.
select is((select count(*) from game.countries where is_active)::int, 13, '13 countries are in play');
select is((select count(*) from game.regions)::int, 78, '78 regions exist');
select is(
  (select count(*) from game.regions where owner_country_code is null)::int,
  0,
  'every region has an owner'
);
select is(
  (select count(*) from game.regions where owner_country_code <> home_country_code)::int,
  0,
  'at the start every region belongs to its home country'
);

-- Reference data.
select is(
  (select count(*) from game.countries)::int,
  250,
  'every country on the map is listed, in play or not'
);
select results_eq(
  $$ select home_country_code, count(*)::int from game.regions group by 1 order by 1 $$,
  $$ values ('ARG', 6), ('BRA', 12), ('CAN', 6), ('CHL', 5), ('DEU', 5), ('ESP', 7), ('FRA', 6),
            ('GBR', 4), ('ITA', 5), ('MEX', 7), ('PRT', 3), ('PRY', 3), ('USA', 9) $$,
  'regions per country match the game design document'
);
select is(
  (select name from game.regions where code = 'ARG-05'),
  'Cuyo',
  'region codes are fixed: ARG-05 is Cuyo'
);
select ok(
  (select 'Mendoza' = any (provinces) from game.regions where code = 'ARG-05'),
  'Cuyo groups Mendoza'
);
select is(
  (select name_en from game.countries where code = 'ESP'),
  'Spain',
  'countries have English names'
);

-- Constraints that keep the data honest.
select throws_ok(
  $$ insert into game.regions (code, home_country_code, owner_country_code, name, provinces)
     values ('ARG-07', 'BRA', 'BRA', 'Nowhere', '{}') $$,
  '23514',
  null,
  'a region code must start with its home country'
);
select throws_ok(
  $$ insert into game.countries (code, name_es, name_en, is_active) values ('ZZZ', 'Z', 'Z', true) $$,
  '23514',
  null,
  'a country in play needs a color and an official name'
);
select throws_ok(
  $$ update game.regions set owner_country_code = 'XXX' where code = 'ARG-01' $$,
  '23503',
  null,
  'the owner must be a known country'
);

-- Public read.
select is((select count(*) from public.list_countries())::int, 250, 'list_countries returns every country');
select is(
  (select count(*) from public.list_countries() where is_active)::int,
  13,
  'list_countries flags the countries in play'
);
select is((select count(*) from public.list_regions())::int, 78, 'list_regions returns the 78 regions');
select ok(
  has_function_privilege('anon', 'public.list_countries()', 'EXECUTE')
    and has_function_privilege('anon', 'public.list_regions()', 'EXECUTE'),
  'the map state is public'
);

-- Players cannot change the world directly.
set local role authenticated;
select throws_ok(
  $$ update game.regions set owner_country_code = 'ESP' where code = 'ARG-05' $$,
  '42501',
  null,
  'players cannot change region owners'
);
reset role;
select is(
  (select owner_country_code from game.regions where code = 'ARG-05'),
  'ARG',
  'Cuyo still belongs to Argentina'
);

select * from finish();
rollback;
