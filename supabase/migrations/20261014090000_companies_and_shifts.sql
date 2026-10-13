-- R5 · Resources, companies N1–N5, shifts and production (spec section 5, ADR 0020).
--
-- game.resources, game.region_resources   the 15 resources and where each one exists
-- game.national_bonus                     +5 % per distinct resource in the country's enabled regions, max +25 %
-- companies                               kind (extractor or manufacturer), category, level N1–N5; a
--                                         manufacturer's quality is its level
-- game.work_shifts                        every shift: regular, second (authorized) or management
-- public.work                             one shift: health > 0, energy, wage minus work tax, inputs taken,
--                                         output produced, all or nothing
-- public.found_company, upgrade_company   costs, civil levels, resource check, foreign construction surcharge
-- public.authorize_second_shift, get_my_shifts_today, list_resources, list_region_resources
--
-- Errors (ADR 0005): resource_missing, level_too_low, good_invalid, region_unavailable, max_level,
-- already_worked, not_employed, company_shifts_exhausted, no_health, inputs_missing, company_cannot_pay,
-- own_company, employee_not_found, wage_below_minimum, amount_invalid.
--
-- Rollback: restore public.work, get_my_workday, get_my_job, get_company_employees, list_my_companies,
-- list_goods, take_job, found_company, upgrade_company, upgrade_company_quality, game.produce,
-- game.raw_yield, game.work_streak and game.company_capacity from 20261009210000 and 20261013110000; drop
-- the functions, tables and columns added here; restore the companies level check (1–3) and the
-- balance_params rows changed here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Parameters ----------------------------------------------------------------------------------------

delete from game.balance_params where key in (
  'company_found_gold', 'company_quality_gold_per_q', 'company_employees_level1', 'company_employees_level2',
  'company_employees_level3', 'work_points', 'raw_yield_base', 'raw_yield_per_level'
);
update game.balance_params set value = 25, updated_at = now(), description = 'GOLD to upgrade a company to N2.'
where key = 'company_level2_gold';
update game.balance_params set value = 50, updated_at = now(), description = 'GOLD to upgrade a company to N3.'
where key = 'company_level3_gold';
insert into game.balance_params (key, value, description) values
  ('company_level1_gold', 10, 'GOLD to found an N1 company (spec section 5).'),
  ('company_level4_gold', 100, 'GOLD to upgrade a company to N4.'),
  ('company_level5_gold', 200, 'GOLD to upgrade a company to N5.'),
  ('company_level1_civil_level', 5, 'Civil level to own an N1 company.'),
  ('company_level2_civil_level', 10, 'Civil level to upgrade to N2.'),
  ('company_level3_civil_level', 20, 'Civil level to upgrade to N3.'),
  ('company_level4_civil_level', 30, 'Civil level to upgrade to N4.'),
  ('company_level5_civil_level', 40, 'Civil level to upgrade to N5.'),
  ('company_shifts_level1', 5, 'Paid employee shifts per day at N1.'),
  ('company_shifts_level2', 10, 'Paid employee shifts per day at N2.'),
  ('company_shifts_level3', 15, 'Paid employee shifts per day at N3.'),
  ('company_shifts_level4', 20, 'Paid employee shifts per day at N4.'),
  ('company_shifts_level5', 25, 'Paid employee shifts per day at N5.'),
  ('extractor_efficiency_level1', 1, 'Extractor efficiency multiplier at N1.'),
  ('extractor_efficiency_level2', 1.25, 'Extractor efficiency multiplier at N2.'),
  ('extractor_efficiency_level3', 1.5, 'Extractor efficiency multiplier at N3.'),
  ('extractor_efficiency_level4', 1.75, 'Extractor efficiency multiplier at N4.'),
  ('extractor_efficiency_level5', 2, 'Extractor efficiency multiplier at N5.'),
  ('extractor_base_output', 150, 'Raw material one extractor shift yields before bonuses and health.'),
  ('national_bonus_per_resource', 0.05, 'Production bonus per distinct active resource of the country.'),
  ('national_bonus_max', 0.25, 'Highest national production bonus (five resources).');

alter table game.country_policies add column foreign_construction_surcharge numeric not null default 0
  check (foreign_construction_surcharge between 0 and 1);
comment on column game.country_policies.foreign_construction_surcharge is
  'Extra share of the GOLD price that foreigners pay to build or upgrade here; it goes to the treasury.';

-- Manufacturing output per shift, before bonuses and health (spec section 5).
alter table game.goods add column base_output integer check (base_output > 0);
comment on column game.goods.base_output is 'Units one manufacturing shift makes before bonuses and health.';
-- Food 100/90/80/70/60, weapons 10/9/8/7/6, kits 20/18/16/14/12.
update game.goods as g set base_output = o.first - o.step * (g.quality - 1)
from (values ('food', 100, 10), ('weapon', 10, 1), ('kit', 20, 2)) as o (line, first, step)
where g.code = o.line || '_q' || g.quality::text;

-- Resources -----------------------------------------------------------------------------------------

create table game.resources (
  code text primary key check (code ~ '^[a-z][a-z_]{2,20}$'),
  category text not null check (category in ('food', 'military', 'medical'))
);
alter table game.resources enable row level security;
comment on table game.resources is 'The 15 natural resources; extraction yields the generic raw material of their category.';

insert into game.resources (code, category) values
  ('wheat', 'food'), ('corn', 'food'), ('rice', 'food'), ('cattle', 'food'), ('fish', 'food'),
  ('iron', 'military'), ('copper', 'military'), ('coal', 'military'), ('sulfur', 'military'), ('oil', 'military'),
  ('cotton', 'medical'), ('latex', 'medical'), ('medicinal_plants', 'medical'), ('salt', 'medical'),
  ('silica_sand', 'medical');

create table game.region_resources (
  region_code text not null references game.regions (code),
  resource_code text not null references game.resources (code),
  primary key (region_code, resource_code)
);
alter table game.region_resources enable row level security;
comment on table game.region_resources is 'Resources each region has, after its real production (ADR 0020).';

insert into game.region_resources (region_code, resource_code)
select m.region, unnest(m.resources)
from (values
  ('ARG-01', array['wheat', 'corn', 'cattle', 'fish']),
  ('ARG-02', array['wheat', 'corn', 'cattle']),
  ('ARG-03', array['copper', 'salt', 'sulfur']),
  ('ARG-04', array['cotton', 'rice', 'medicinal_plants', 'cattle']),
  ('ARG-05', array['oil', 'copper']),
  ('ARG-06', array['oil', 'fish', 'coal', 'cattle']),
  ('BRA-01', array['latex', 'medicinal_plants', 'oil', 'fish']),
  ('BRA-02', array['iron', 'copper', 'latex', 'cattle']),
  ('BRA-03', array['latex', 'cattle', 'medicinal_plants']),
  ('BRA-04', array['rice', 'corn']),
  ('BRA-05', array['salt', 'cotton', 'fish']),
  ('BRA-06', array['cotton', 'salt', 'fish']),
  ('BRA-07', array['cotton', 'latex', 'oil', 'cattle']),
  ('BRA-08', array['corn', 'wheat', 'cattle', 'cotton']),
  ('BRA-09', array['iron', 'corn', 'cattle', 'silica_sand']),
  ('BRA-10', array['corn', 'cattle', 'silica_sand']),
  ('BRA-11', array['oil', 'iron', 'fish']),
  ('BRA-12', array['wheat', 'rice', 'cattle', 'coal']),
  ('CAN-01', array['fish', 'oil', 'iron', 'coal']),
  ('CAN-02', array['iron', 'copper', 'silica_sand']),
  ('CAN-03', array['copper', 'salt', 'corn']),
  ('CAN-04', array['wheat', 'oil', 'cattle', 'sulfur']),
  ('CAN-05', array['coal', 'copper', 'fish']),
  ('CAN-06', array['oil', 'copper']),
  ('CHL-01', array['copper', 'salt', 'sulfur', 'fish']),
  ('CHL-02', array['copper', 'iron', 'fish']),
  ('CHL-03', array['wheat', 'corn', 'copper']),
  ('CHL-04', array['fish', 'cattle', 'wheat', 'coal']),
  ('CHL-05', array['oil', 'cattle', 'fish', 'coal']),
  ('DEU-01', array['fish', 'wheat', 'cattle']),
  ('DEU-02', array['coal', 'silica_sand']),
  ('DEU-03', array['wheat', 'salt', 'silica_sand']),
  ('DEU-04', array['coal', 'wheat']),
  ('DEU-05', array['cattle', 'wheat', 'salt']),
  ('ESP-01', array['fish', 'coal', 'cattle']),
  ('ESP-02', array['iron', 'wheat']),
  ('ESP-03', array['wheat']),
  ('ESP-04', array['wheat', 'cattle', 'coal']),
  ('ESP-05', array['rice', 'salt', 'fish']),
  ('ESP-06', array['copper', 'cotton', 'fish']),
  ('ESP-07', array['fish', 'salt']),
  ('FRA-01', array['wheat', 'fish']),
  ('FRA-02', array['fish', 'cattle', 'salt']),
  ('FRA-03', array['iron', 'coal', 'salt', 'wheat']),
  ('FRA-04', array['corn', 'sulfur', 'cattle']),
  ('FRA-05', array['medicinal_plants', 'rice', 'salt']),
  ('FRA-06', array['fish', 'medicinal_plants']),
  ('GBR-01', array['wheat', 'coal', 'cattle', 'salt']),
  ('GBR-02', array['oil', 'fish', 'cattle']),
  ('GBR-03', array['coal', 'cattle']),
  ('GBR-04', array['cattle', 'fish']),
  ('ITA-01', array['rice', 'corn', 'cattle']),
  ('ITA-02', array['corn', 'cattle', 'wheat']),
  ('ITA-03', array['wheat', 'iron']),
  ('ITA-04', array['wheat', 'oil', 'medicinal_plants']),
  ('ITA-05', array['sulfur', 'salt', 'fish', 'coal']),
  ('MEX-01', array['copper', 'fish', 'wheat', 'salt']),
  ('MEX-02', array['copper', 'iron', 'cattle']),
  ('MEX-03', array['coal', 'iron', 'oil']),
  ('MEX-04', array['corn', 'cattle', 'iron']),
  ('MEX-05', array['corn', 'wheat']),
  ('MEX-06', array['medicinal_plants', 'latex', 'corn']),
  ('MEX-07', array['oil', 'sulfur', 'fish']),
  ('PRT-01', array['fish', 'copper', 'wheat', 'salt']),
  ('PRT-02', array['cattle', 'fish']),
  ('PRT-03', array['fish']),
  ('PRY-01', array['cattle']),
  ('PRY-02', array['wheat', 'corn', 'medicinal_plants']),
  ('PRY-03', array['rice', 'cotton', 'cattle']),
  ('USA-01', array['fish']),
  ('USA-02', array['coal', 'silica_sand']),
  ('USA-03', array['corn', 'coal', 'salt', 'silica_sand']),
  ('USA-04', array['wheat', 'corn', 'cattle', 'iron']),
  ('USA-05', array['cotton', 'coal', 'fish']),
  ('USA-06', array['cotton', 'coal', 'corn']),
  ('USA-07', array['oil', 'rice', 'cattle', 'sulfur']),
  ('USA-08', array['copper', 'coal', 'cattle']),
  ('USA-09', array['fish', 'oil', 'rice'])
) as m (region, resources);

-- Distinct resources in the country's enabled regions, +5 % each, at most +25 %.
create function game.national_bonus(p_country_code text)
returns numeric
language sql
stable
set search_path = ''
as $$
  select least(
    game.param('national_bonus_max'),
    game.param('national_bonus_per_resource') * (
      select count(distinct rr.resource_code)
      from game.region_resources as rr
      join game.regions as r on r.code = rr.region_code
      where r.owner_country_code = p_country_code and r.is_enabled
    )
  );
$$;
comment on function game.national_bonus(text) is
  'National production bonus: +5 % per distinct resource of the country''s enabled regions, at most +25 %.';

-- Companies -----------------------------------------------------------------------------------------

alter table game.companies add column kind text check (kind in ('extractor', 'manufacturer'));
alter table game.companies add column category text check (category in ('food', 'military', 'medical'));
comment on column game.companies.kind is 'Extractors yield the raw material of their category; manufacturers make Q products.';
comment on column game.companies.points is 'Unused since R5: production follows the shift formulas.';

-- Fuel has no place in the specification: its companies become military extractors.
update game.companies set good_code = 'military_raw' where good_code = 'fuel';
update game.companies as c
set kind = case when g.kind = 'raw' then 'extractor' else 'manufacturer' end,
    category = g.category,
    level = greatest(c.level, coalesce(g.quality, 1))
from game.goods as g
where g.code = c.good_code;
-- A manufacturer's quality is its level.
update game.companies
set good_code = regexp_replace(good_code, '_q[1-5]$', '_q' || level::text)
where kind = 'manufacturer';

-- The column is filled for every row just above, in the same transaction.
-- squawk-ignore adding-not-nullable-field
alter table game.companies alter column kind set not null;
-- squawk-ignore adding-not-nullable-field
alter table game.companies alter column category set not null;
-- Replaced right below by the N1–N5 range.
-- squawk-ignore ban-drop-constraint
alter table game.companies drop constraint companies_level_check;
-- squawk-ignore constraint-missing-not-valid
alter table game.companies add constraint companies_level_check check (level between 1 and 5);

-- Kind and category always follow the good: one source of truth however a company is created or changed.
create function game.derive_company_kind()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select case when g.kind = 'raw' then 'extractor' else 'manufacturer' end, g.category
  into new.kind, new.category
  from game.goods as g
  where g.code = new.good_code;
  return new;
end;
$$;

create trigger companies_derive_kind
before insert or update of good_code on game.companies
for each row execute function game.derive_company_kind();

alter table game.employments add column second_shift_wage bigint check (second_shift_wage >= 0);
comment on column game.employments.second_shift_wage is
  'Wage of an authorized second paid shift a day; null when the employer has not authorized one.';

create table game.work_shifts (
  id bigint generated always as identity primary key,
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  company_id bigint not null references game.companies (id),
  game_day date not null,
  kind text not null check (kind in ('regular', 'second', 'management')),
  gross bigint not null check (gross >= 0),
  tax bigint not null check (tax >= 0),
  good_code text not null references game.goods (code),
  output numeric not null check (output >= 0),
  inputs numeric not null check (inputs >= 0),
  idempotency_key text not null,
  created_at timestamptz not null,
  constraint work_shifts_key unique (user_id, idempotency_key)
);
alter table game.work_shifts enable row level security;
comment on table game.work_shifts is 'Every shift worked: paid (regular or second) or the owner''s unpaid management shift.';

create unique index work_shifts_regular_key on game.work_shifts (user_id, game_day) where kind = 'regular';
create unique index work_shifts_second_key on game.work_shifts (user_id, game_day) where kind = 'second';
create unique index work_shifts_management_key on game.work_shifts (user_id, company_id, game_day)
  where kind = 'management';
create index work_shifts_company_day_idx on game.work_shifts (company_id, game_day);

-- Rules ---------------------------------------------------------------------------------------------

create or replace function game.company_capacity(p_level integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select game.param('company_shifts_level' || p_level::text)::integer;
$$;
comment on function game.company_capacity(integer) is 'Paid employee shifts a company runs per day (and employees it hires).';

create function game.company_efficiency(p_level integer)
returns numeric
language sql
stable
set search_path = ''
as $$
  select game.param('extractor_efficiency_level' || p_level::text);
$$;

-- Output of one shift, with a single final rounding (spec section 5).
create function game.shift_output(p_company game.companies, p_health integer)
returns numeric
language sql
stable
set search_path = ''
as $$
  select floor(
    case when p_company.kind = 'extractor'
         then game.param('extractor_base_output') * game.company_efficiency(p_company.level)
         else g.base_output end
    * p_health / game.param('health_max')
    * (1 + game.national_bonus(p_company.country_code))
  )
  from game.goods as g
  where g.code = p_company.good_code;
$$;
comment on function game.shift_output(game.companies, integer) is
  'floor(150 × efficiency × HP/100 × (1 + bonus)) for extractors; floor(base_Q × HP/100 × (1 + bonus)) for manufacturers.';

create or replace function game.work_streak(p_user_id uuid, p_company_id bigint)
returns integer
language sql
stable
set search_path = ''
as $$
  with days as (
    select game_day, game_day - (row_number() over (order by game_day))::integer as island
    from game.work_shifts
    where user_id = p_user_id and company_id = p_company_id and kind = 'regular'
  )
  select coalesce((
    select count(*)::integer from days
    where island = (select island from days order by game_day desc limit 1)
      and (select max(game_day) from days) >= game.game_day() - 1
  ), 0);
$$;

-- The price of reaching a level: the GOLD to burn and, for a foreign owner, the host's surcharge.
create function game.company_price(p_level integer, p_owner_country text, p_host_country text)
returns table (base bigint, surcharge bigint)
language sql
stable
set search_path = ''
as $$
  select (game.param('company_level' || p_level::text || '_gold') * 100)::bigint,
         case when p_owner_country = p_host_country then 0::bigint
              else round(game.param('company_level' || p_level::text || '_gold') * 100
                         * (select foreign_construction_surcharge from game.country_policies
                            where country_code = p_host_country))::bigint end;
$$;

-- Pays a company price: the base is burned, the surcharge goes to the host treasury.
create function game.pay_company_price(
  p_user_id uuid, p_level integer, p_host_country text, p_kind text, p_key text, p_memo text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_owner_country text := (select country_code from game.citizens where user_id = p_user_id);
  v_price record;
  v_legs game.ledger_leg[];
begin
  if game.level_for_experience((select experience from game.player_stats where user_id = p_user_id))
     < game.param('company_level' || p_level::text || '_civil_level') then
    raise exception 'level_too_low' using errcode = '22023';
  end if;
  select * into v_price from game.company_price(p_level, v_owner_country, p_host_country);
  v_legs := array[row(game.citizen_account(p_user_id, 'GOLD'), game.system_account('sink', 'GOLD'),
                      v_price.base, p_kind, p_memo)::game.ledger_leg];
  if v_price.surcharge > 0 then
    v_legs := v_legs || row(game.citizen_account(p_user_id, 'GOLD'), game.treasury_account(p_host_country, 'GOLD'),
                            v_price.surcharge, 'construction_surcharge', p_memo)::game.ledger_leg;
  end if;
  perform game.post(p_kind, p_key, p_user_id, v_legs);
end;
$$;

-- Founding and upgrading -------------------------------------------------------------------------------

create or replace function public.found_company(p_name text, p_good_code text, p_region_code text, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'company:' || auth.uid()::text || ':' || p_key::text;
  v_name text := btrim(p_name);
  v_good game.goods;
  v_host text;
  v_id bigint;
begin
  select id into v_id from game.companies where creation_key = v_key;
  if found then
    return v_id;
  end if;
  if char_length(v_name) not between 3 and 40 then
    raise exception 'company_name_invalid' using errcode = '22023';
  end if;
  -- An extractor of a raw material, or a manufacturer of a Q1 line (its quality follows its level).
  select * into v_good from game.goods where code = p_good_code and active and coalesce(quality, 1) = 1;
  if not found then
    raise exception 'good_invalid' using errcode = '22023';
  end if;
  -- Any enabled region of a country in play; foreign owners pay the host's surcharge.
  select r.owner_country_code into v_host
  from game.regions as r join game.countries as c on c.code = r.owner_country_code
  where r.code = p_region_code and r.is_enabled and c.is_active;
  if v_host is null then
    raise exception 'region_unavailable' using errcode = '22023';
  end if;
  if v_good.kind = 'raw' and not exists (
    select 1 from game.region_resources as rr join game.resources as res on res.code = rr.resource_code
    where rr.region_code = p_region_code and res.category = v_good.category
  ) then
    raise exception 'resource_missing' using errcode = '22023';
  end if;

  perform game.pay_company_price(auth.uid(), 1, v_host, 'company_founded', v_key, v_name);
  begin
    insert into game.companies (name, owner_user_id, country_code, region_code, good_code, kind, category,
                                creation_key, created_at)
    values (v_name, auth.uid(), v_host, p_region_code, v_good.code,
            case when v_good.kind = 'raw' then 'extractor' else 'manufacturer' end, v_good.category,
            v_key, game.now())
    returning id into v_id;
  exception when unique_violation then
    raise exception 'company_name_taken' using errcode = '23505';
  end;
  perform game.company_account(v_id, v_host);
  return v_id;
end;
$$;
comment on function public.found_company(text, text, text, uuid) is
  'Founds an N1 extractor (where its resource exists) or Q1 manufacturer, anywhere in play: 10 GOLD, civil level 5.';

create or replace function public.upgrade_company(p_company_id bigint, p_key uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company game.companies := game.own_company(p_company_id);
begin
  if v_company.level >= 5 then
    raise exception 'max_level' using errcode = '22023';
  end if;
  perform game.pay_company_price(auth.uid(), v_company.level + 1, v_company.country_code, 'company_upgraded',
                                 'upgrade:' || auth.uid()::text || ':' || p_key::text, v_company.name);
  update game.companies
  set level = level + 1,
      good_code = case when kind = 'manufacturer'
                       then regexp_replace(good_code, '_q[1-5]$', '_q' || (level + 1)::text)
                       else good_code end
  where id = p_company_id;
  return v_company.level + 1;
end;
$$;
comment on function public.upgrade_company(bigint, uuid) is
  'Raises a company one level (more shifts; efficiency or quality) for 25/50/100/200 GOLD and civil level 10/20/30/40.';

-- squawk-ignore ban-drop-function
drop function public.upgrade_company_quality(bigint, uuid);
-- squawk-ignore ban-drop-function
drop function game.produce(bigint);
-- squawk-ignore ban-drop-function
drop function game.raw_yield(text, text);

-- Jobs and shifts -----------------------------------------------------------------------------------

create or replace function public.take_job(p_company_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_company game.companies;
  v_last timestamptz;
begin
  select * into v_company from game.companies where id = p_company_id for update;
  if not found then
    raise exception 'no_vacancies' using errcode = '22023';
  end if;
  if v_company.owner_user_id = v_citizen.user_id then
    raise exception 'own_company' using errcode = '22023';
  end if;
  if v_company.country_code <> v_citizen.country_code then
    raise exception 'wrong_country' using errcode = '22023';
  end if;
  if v_company.vacancies <= 0 then
    raise exception 'no_vacancies' using errcode = '22023';
  end if;
  if (select count(*) from game.employments where company_id = p_company_id) >= game.company_capacity(v_company.level) then
    raise exception 'company_full' using errcode = '22023';
  end if;
  select max(hired_at) into v_last from game.job_history where user_id = v_citizen.user_id;
  if v_last > game.now() - make_interval(hours => game.param('job_change_hours')::integer) then
    raise exception 'job_change_too_soon' using errcode = '22023';
  end if;

  update game.job_history set left_at = game.now() where user_id = v_citizen.user_id and left_at is null;
  delete from game.employments where user_id = v_citizen.user_id;
  insert into game.employments (user_id, company_id, hired_at) values (v_citizen.user_id, p_company_id, game.now());
  insert into game.job_history (user_id, company_id, hired_at) values (v_citizen.user_id, p_company_id, game.now());
  update game.companies set vacancies = vacancies - 1 where id = p_company_id;
end;
$$;

create function public.authorize_second_shift(p_company_id bigint, p_employee_name text, p_wage bigint default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company game.companies := game.own_company(p_company_id);
  v_employee uuid;
begin
  select e.user_id into v_employee
  from game.employments as e join game.citizens as c on c.user_id = e.user_id
  where e.company_id = p_company_id and (c.name collate game.citizen_name) = btrim(p_employee_name);
  if v_employee is null then
    raise exception 'employee_not_found' using errcode = 'P0002';
  end if;
  if p_wage is not null and p_wage < 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if p_wage < (select minimum_wage from game.country_policies where country_code = v_company.country_code) then
    raise exception 'wage_below_minimum' using errcode = '22023';
  end if;
  update game.employments set second_shift_wage = p_wage where user_id = v_employee;
end;
$$;
comment on function public.authorize_second_shift(bigint, text, bigint) is
  'Authorizes (with its wage) or, without a wage, revokes an employee''s second paid shift a day.';
grant execute on function public.authorize_second_shift(bigint, text, bigint) to authenticated;

-- squawk-ignore ban-drop-function
drop function public.work(uuid, bigint);

-- One shift. With p_company_id of an own company: the unpaid management shift there. Otherwise the job's
-- regular shift, then the authorized second one. Everything happens or nothing does.
create function public.work(p_key uuid, p_company_id bigint default null)
returns table (kind text, gross bigint, tax bigint, net bigint, energy integer, produced numeric, good_code text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := p_key::text;
  v_reference text := 'shift:' || v_citizen.user_id::text || ':' || p_key::text;
  v_day date := game.game_day();
  v_company game.companies;
  v_employment game.employments;
  v_good game.goods;
  v_kind text;
  v_gross bigint := 0;
  v_tax bigint := 0;
  v_health integer;
  v_output numeric;
  v_inputs numeric := 0;
  v_holder bigint;
  v_energy integer;
begin
  -- The same request again returns its shift.
  if exists (select 1 from game.work_shifts as s where s.user_id = v_citizen.user_id and s.idempotency_key = v_key) then
    return query
      select s.kind, s.gross, s.tax, s.gross - s.tax, (select pr.energy from public.get_my_profile() as pr),
             s.output, s.good_code
      from game.work_shifts as s
      where s.user_id = v_citizen.user_id and s.idempotency_key = v_key;
    return;
  end if;

  select * into v_employment from game.employments as e where e.user_id = v_citizen.user_id;
  if p_company_id is not null
     and exists (select 1 from game.companies as c where c.id = p_company_id and c.owner_user_id = v_citizen.user_id) then
    select * into v_company from game.companies as c where c.id = p_company_id for update;
    v_kind := 'management';
    if exists (select 1 from game.work_shifts as s
               where s.user_id = v_citizen.user_id and s.company_id = v_company.id and s.game_day = v_day
                 and s.kind = 'management') then
      raise exception 'already_worked' using errcode = '22023';
    end if;
  else
    if v_employment.user_id is null or (p_company_id is not null and p_company_id <> v_employment.company_id) then
      raise exception 'not_employed' using errcode = '22023';
    end if;
    select * into v_company from game.companies as c where c.id = v_employment.company_id for update;
    if not exists (select 1 from game.work_shifts as s
                   where s.user_id = v_citizen.user_id and s.game_day = v_day and s.kind = 'regular') then
      v_kind := 'regular';
      v_gross := v_company.wage;
    elsif v_employment.second_shift_wage is not null
          and not exists (select 1 from game.work_shifts as s
                          where s.user_id = v_citizen.user_id and s.game_day = v_day and s.kind = 'second') then
      v_kind := 'second';
      v_gross := v_employment.second_shift_wage;
    else
      raise exception 'already_worked' using errcode = '22023';
    end if;
    if (select count(*) from game.work_shifts as s
        where s.company_id = v_company.id and s.game_day = v_day and s.kind in ('regular', 'second'))
       >= game.company_capacity(v_company.level) then
      raise exception 'company_shifts_exhausted' using errcode = '22023';
    end if;
  end if;

  v_health := (select ps.health from game.player_stats as ps where ps.user_id = v_citizen.user_id);
  if v_health <= 0 then
    raise exception 'no_health' using errcode = '22023';
  end if;
  select * into v_good from game.goods as g where g.code = v_company.good_code;
  if not v_good.active then
    raise exception 'good_invalid' using errcode = '22023';
  end if;
  v_output := game.shift_output(v_company, v_health);
  v_holder := game.holder_for_company(v_company.id);
  if v_company.kind = 'manufacturer' then
    v_inputs := v_output * v_good.input_per_unit;
    if v_inputs > 0 and game.holder_quantity(v_holder, v_good.input_good_code) < v_inputs then
      raise exception 'inputs_missing' using errcode = '22023';
    end if;
  end if;

  v_energy := game.spend_energy(v_citizen.user_id, game.param('work_energy')::integer);

  if v_gross > 0 then
    v_tax := round(v_gross * (select p.work_tax from game.country_policies as p where p.country_code = v_company.country_code));
    begin
      perform game.post(
        'wage', 'wage:' || v_citizen.user_id::text || ':' || v_key, v_citizen.user_id,
        array[
          row(game.company_account(v_company.id, v_company.country_code),
              game.citizen_account(v_citizen.user_id, v_company.country_code), v_gross, 'wage', v_company.name)::game.ledger_leg,
          row(game.citizen_account(v_citizen.user_id, v_company.country_code),
              game.treasury_account(v_company.country_code, v_company.country_code), v_tax, 'work_tax', null)::game.ledger_leg
        ]
      );
    exception when sqlstate '22023' then
      if sqlerrm = 'insufficient_funds' then
        raise exception 'company_cannot_pay' using errcode = '22023';
      end if;
      raise;
    end;
  end if;

  if v_inputs > 0 then
    perform game.take_goods(v_holder, v_good.input_good_code, v_inputs, 'production_input', v_reference);
  end if;
  if v_output > 0 then
    perform game.put_goods(v_holder, v_good.code, v_company.country_code, v_output, 'production', v_reference);
  end if;

  insert into game.work_shifts (user_id, company_id, game_day, kind, gross, tax, good_code, output, inputs,
                                idempotency_key, created_at)
  values (v_citizen.user_id, v_company.id, v_day, v_kind, v_gross, v_tax, v_good.code, v_output, v_inputs,
          v_key, game.now());

  return query select v_kind, v_gross, v_tax, v_gross - v_tax, v_energy, v_output, v_good.code;
end;
$$;
comment on function public.work(uuid, bigint) is
  'One shift: management in an own company, or the job''s regular then authorized second shift. Idempotent per key.';
grant execute on function public.work(uuid, bigint) to authenticated;

-- squawk-ignore ban-drop-function
drop function public.get_my_workday();

create function public.get_my_shifts_today()
returns table (
  kind text, company_id bigint, company_name text, gross bigint, tax bigint, net bigint, produced numeric,
  good_code text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.kind, s.company_id, c.name, s.gross, s.tax, s.gross - s.tax, s.output, s.good_code
  from game.work_shifts as s
  join game.companies as c on c.id = s.company_id
  where s.user_id = auth.uid() and s.game_day = game.game_day()
  order by s.id;
$$;
comment on function public.get_my_shifts_today() is 'The shifts the player worked today, with what each paid and made.';
grant execute on function public.get_my_shifts_today() to authenticated;

-- squawk-ignore ban-drop-function
drop function public.get_my_job();

create function public.get_my_job()
returns table (
  company_id bigint, company_name text, good_code text, region_code text, owner_name text, wage bigint,
  work_tax numeric, streak integer, worked_today boolean, second_shift_wage bigint, hired_at timestamptz,
  next_change_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select co.id, co.name, co.good_code, co.region_code, owner.name, co.wage, p.work_tax,
         game.work_streak(e.user_id, co.id),
         exists (select 1 from game.work_shifts as s
                 where s.user_id = e.user_id and s.game_day = game.game_day() and s.kind = 'regular'),
         e.second_shift_wage,
         e.hired_at,
         e.hired_at + make_interval(hours => game.param('job_change_hours')::integer)
  from game.employments as e
  join game.companies as co on co.id = e.company_id
  join game.citizens as owner on owner.user_id = co.owner_user_id
  join game.country_policies as p on p.country_code = co.country_code
  where e.user_id = auth.uid();
$$;
grant execute on function public.get_my_job() to authenticated;

-- squawk-ignore ban-drop-function
drop function public.get_company_employees(bigint);

create function public.get_company_employees(p_company_id bigint)
returns table (name text, hired_at timestamptz, worked_today boolean, streak integer, second_shift_wage bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, e.hired_at,
         exists (select 1 from game.work_shifts as s
                 where s.user_id = e.user_id and s.game_day = game.game_day() and s.company_id = e.company_id
                   and s.kind = 'regular'),
         game.work_streak(e.user_id, e.company_id),
         e.second_shift_wage
  from game.employments as e
  join game.citizens as c on c.user_id = e.user_id
  where e.company_id = p_company_id
    and exists (select 1 from game.companies as co where co.id = p_company_id and co.owner_user_id = auth.uid())
  order by e.hired_at;
$$;
grant execute on function public.get_company_employees(bigint) to authenticated;

-- squawk-ignore ban-drop-function
drop function public.list_my_companies();

create function public.list_my_companies()
returns table (
  id bigint, name text, kind text, category text, good_code text, region_code text, country_code text,
  level integer, shifts_per_day integer, shifts_today integer, efficiency numeric, national_bonus numeric,
  wage bigint, vacancies integer, cash bigint, employees integer, created_at timestamptz,
  next_level_gold bigint, next_level_civil_level integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.kind, c.category, c.good_code, c.region_code, c.country_code, c.level,
         game.company_capacity(c.level),
         (select count(*)::integer from game.work_shifts as s
          where s.company_id = c.id and s.game_day = game.game_day() and s.kind in ('regular', 'second')),
         case when c.kind = 'extractor' then game.company_efficiency(c.level) end,
         game.national_bonus(c.country_code),
         c.wage, c.vacancies,
         coalesce((select a.balance from game.accounts as a
                   where a.kind = 'company' and a.company_id = c.id and a.currency_code = c.country_code), 0),
         (select count(*)::integer from game.employments as e where e.company_id = c.id),
         c.created_at,
         case when c.level < 5 then
           (select price.base + price.surcharge from game.company_price(c.level + 1, me.country_code, c.country_code) as price)
         end,
         case when c.level < 5 then game.param('company_level' || (c.level + 1)::text || '_civil_level')::integer end
  from game.companies as c
  join game.citizens as me on me.user_id = c.owner_user_id
  where c.owner_user_id = auth.uid()
  order by c.created_at;
$$;
comment on function public.list_my_companies() is
  'The player''s companies: level, paid shifts used today, efficiency, national bonus, cash and the next upgrade.';
grant execute on function public.list_my_companies() to authenticated;

-- squawk-ignore ban-drop-function
drop function public.list_goods();

create function public.list_goods()
returns table (
  code text, kind text, category text, input_good_code text, input_per_unit numeric, quality integer,
  energy integer, heal integer, base_output integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.code, g.kind, g.category, g.input_good_code, g.input_per_unit, g.quality, g.energy, g.heal, g.base_output
  from game.goods as g
  where g.active
  order by g.kind desc, g.category, g.quality nulls first, g.code;
$$;
comment on function public.list_goods() is 'Active goods with their recipes, effects and output per shift. Public.';
grant execute on function public.list_goods() to anon, authenticated;

create function public.list_resources()
returns table (code text, category text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.code, r.category from game.resources as r order by r.category, r.code;
$$;
comment on function public.list_resources() is 'The 15 resources and their category. Public.';
grant execute on function public.list_resources() to anon, authenticated;

create function public.list_region_resources()
returns table (region_code text, resource_code text, category text)
language sql
stable
security definer
set search_path = ''
as $$
  select rr.region_code, rr.resource_code, r.category
  from game.region_resources as rr join game.resources as r on r.code = rr.resource_code
  order by rr.region_code, r.category, rr.resource_code;
$$;
comment on function public.list_region_resources() is 'The resources of every region, for the map and founding. Public.';
grant execute on function public.list_region_resources() to anon, authenticated;
