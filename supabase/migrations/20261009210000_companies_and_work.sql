-- D10 · Companies and work (ADR 0012).
--
-- game.goods              raw materials and products with the brief's recipes
-- game.country_policies   taxes and minimum wage per country (laws change them from D21)
-- game.companies          one good, one region, level, wage, vacancies, points waiting for inputs
-- game.company_stock      what each company holds
-- game.employments        the player's current job; game.job_history keeps past ones
-- game.workdays           one per player and game day, with the payslip
-- public.found_company, set_company_offer, fund_company, withdraw_from_company, upgrade_company,
--   upgrade_company_quality, list_my_companies, get_company_employees, get_company_stock,
--   list_job_offers, take_job, leave_job, get_my_job, work, list_goods
--
-- Errors (ADR 0005): company_name_invalid, company_name_taken, good_invalid, region_unavailable,
-- not_your_company, wage_below_minimum, amount_invalid, insufficient_funds, max_level, not_weapons,
-- max_quality, no_vacancies, company_full, wrong_country, job_change_too_soon, not_employed,
-- already_worked, company_cannot_pay, not_enough_energy, no_citizen, not_authenticated.
--
-- Rollback: drop the public functions and game functions created here, the tables in reverse order,
-- the accounts.company_id column (after deleting company accounts and their postings in a copy) and restore
-- the accounts kind constraints from 20261009200000; delete the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('company_found_gold', 20, 'Gold to found a company (brief).'),
  ('company_level2_gold', 30, 'Gold to upgrade a company to level 2.'),
  ('company_level3_gold', 60, 'Gold to upgrade a company to level 3.'),
  ('company_quality_gold_per_q', 20, 'Gold to raise a weapon company from Q to Q+1, times Q.'),
  ('company_employees_level1', 10, 'Employees of a level 1 company.'),
  ('company_employees_level2', 20, 'Employees of a level 2 company.'),
  ('company_employees_level3', 40, 'Employees of a level 3 company.'),
  ('work_energy', 10, 'Energy a workday costs.'),
  ('work_points', 10, 'Production points a workday gives.'),
  ('raw_yield_base', 0.5, 'Yield of raw materials in a region without a deposit (brief).'),
  ('raw_yield_per_level', 0.15, 'Yield added by each deposit level (brief).'),
  ('job_change_hours', 24, 'Hours between taking two jobs.');

-- Goods ---------------------------------------------------------------------------------------------

create table game.goods (
  code text primary key check (code ~ '^[a-z][a-z0-9_]{2,20}$'),
  kind text not null check (kind in ('raw', 'product')),
  input_good_code text references game.goods (code),
  input_per_unit numeric,
  points_per_unit numeric not null check (points_per_unit > 0),
  quality integer check (quality between 1 and 5),
  constraint goods_recipe check ((kind = 'raw') = (input_good_code is null and input_per_unit is null))
);
alter table game.goods enable row level security;
comment on table game.goods is 'Raw materials (each point makes 1 unit × yield) and products (recipe of points and an input).';

insert into game.goods (code, kind, input_good_code, input_per_unit, points_per_unit, quality) values
  ('wheat', 'raw', null, null, 1, null),
  ('iron', 'raw', null, null, 1, null),
  ('oil', 'raw', null, null, 1, null),
  ('ration', 'product', 'wheat', 1, 2, null),
  ('fuel', 'product', 'oil', 1, 0.5, null),
  ('weapon_q1', 'product', 'iron', 1, 1, 1),
  ('weapon_q2', 'product', 'iron', 2, 2, 2),
  ('weapon_q3', 'product', 'iron', 3, 3, 3),
  ('weapon_q4', 'product', 'iron', 4, 4, 4),
  ('weapon_q5', 'product', 'iron', 5, 5, 5);

-- Country policies -------------------------------------------------------------------------------------

create table game.country_policies (
  country_code text primary key references game.countries (code),
  work_tax numeric not null default 0.12 check (work_tax between 0 and 0.30),
  vat numeric not null default 0.05 check (vat between 0 and 0.25),
  tariff numeric not null default 0.10 check (tariff between 0 and 0.50),
  minimum_wage bigint not null default 0 check (minimum_wage >= 0)
);
alter table game.country_policies enable row level security;
comment on table game.country_policies is 'Taxes (GDD legal ranges) and minimum wage in hundredths. Laws change them (D21).';

insert into game.country_policies (country_code) select code from game.countries;

-- Companies ---------------------------------------------------------------------------------------------

create table game.companies (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 3 and 40),
  owner_user_id uuid not null references game.citizens (user_id) on delete restrict,
  country_code text not null references game.countries (code),
  region_code text not null references game.regions (code),
  good_code text not null references game.goods (code),
  level integer not null default 1 check (level between 1 and 3),
  wage bigint not null default 0 check (wage >= 0),
  vacancies integer not null default 0 check (vacancies >= 0),
  points numeric not null default 0 check (points >= 0),
  creation_key text unique,
  created_at timestamptz not null
);
alter table game.companies enable row level security;
comment on table game.companies is 'A player''s company. Its cash is a ledger account of kind company.';
comment on column game.companies.points is 'Work points not yet turned into products (waiting for inputs).';

create unique index companies_name_key on game.companies ((name collate game.citizen_name));
create index companies_owner_idx on game.companies (owner_user_id);
create index companies_country_idx on game.companies (country_code) where vacancies > 0;

create table game.company_stock (
  company_id bigint not null references game.companies (id),
  good_code text not null references game.goods (code),
  quantity numeric not null default 0 check (quantity >= 0),
  primary key (company_id, good_code)
);
alter table game.company_stock enable row level security;
comment on table game.company_stock is 'Goods a company holds. Raw units can be fractional (yield).';

-- Company cash in the ledger.
-- squawk-ignore adding-foreign-key-constraint
alter table game.accounts add column company_id bigint references game.companies (id);
-- Both checks are replaced right below, in the same transaction, by wider ones that admit company accounts.
-- squawk-ignore ban-drop-constraint
alter table game.accounts drop constraint accounts_kind_check;
-- squawk-ignore constraint-missing-not-valid
alter table game.accounts add constraint accounts_kind_check
  check (kind in ('citizen', 'treasury', 'issuer', 'sink', 'company'));
-- squawk-ignore ban-drop-constraint
alter table game.accounts drop constraint accounts_owner_matches_kind;
-- squawk-ignore constraint-missing-not-valid
alter table game.accounts add constraint accounts_owner_matches_kind check (
  case kind
    when 'citizen' then user_id is not null and country_code is null and company_id is null
    when 'treasury' then user_id is null and country_code is not null and company_id is null
    when 'company' then user_id is null and country_code is null and company_id is not null
    else user_id is null and country_code is null and company_id is null
  end
);
-- squawk-ignore require-concurrent-index-creation
create unique index accounts_company_key on game.accounts (company_id, currency_code) where kind = 'company';

create function game.company_account(p_company_id bigint, p_currency text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into game.accounts (currency_code, kind, company_id)
  values (p_currency, 'company', p_company_id)
  on conflict (company_id, currency_code) where kind = 'company' do nothing;
  select id into v_id from game.accounts where kind = 'company' and company_id = p_company_id and currency_code = p_currency;
  return v_id;
end;
$$;
comment on function game.company_account(bigint, text) is 'A company''s cash account in a currency, opened on first use.';

-- Jobs and workdays -------------------------------------------------------------------------------------

create table game.employments (
  user_id uuid primary key references game.citizens (user_id) on delete cascade,
  company_id bigint not null references game.companies (id),
  hired_at timestamptz not null
);
alter table game.employments enable row level security;
create index employments_company_idx on game.employments (company_id);

create table game.job_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  company_id bigint not null references game.companies (id),
  hired_at timestamptz not null,
  left_at timestamptz
);
alter table game.job_history enable row level security;
create index job_history_user_idx on game.job_history (user_id, hired_at desc);

create table game.workdays (
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  game_day date not null,
  company_id bigint not null references game.companies (id),
  gross bigint not null check (gross >= 0),
  tax bigint not null check (tax >= 0),
  produced numeric not null check (produced >= 0),
  idempotency_key text,
  created_at timestamptz not null,
  primary key (user_id, game_day)
);
alter table game.workdays enable row level security;
comment on table game.workdays is 'One per player and game day: working twice is impossible by key.';
create unique index workdays_key on game.workdays (user_id, idempotency_key);
create index workdays_company_day_idx on game.workdays (company_id, game_day);

-- Rules -------------------------------------------------------------------------------------------------

create function game.raw_yield(p_region_code text, p_good_code text)
returns numeric
language sql
stable
set search_path = ''
as $$
  -- Deposits (D22) add raw_yield_per_level per level; until then every region yields the base.
  select game.param('raw_yield_base') + 0 * game.param('raw_yield_per_level')
  where p_region_code is not null and p_good_code is not null;
$$;
comment on function game.raw_yield(text, text) is 'Share of each point a region turns into raw material.';

create function game.company_capacity(p_level integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select game.param('company_employees_level' || p_level::text)::integer;
$$;

create function game.require_citizen()
returns game.citizens
language plpgsql
stable
set search_path = ''
as $$
declare
  v_citizen game.citizens;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_citizen from game.citizens where user_id = auth.uid();
  if not found then
    raise exception 'no_citizen' using errcode = 'P0002';
  end if;
  return v_citizen;
end;
$$;
comment on function game.require_citizen() is 'The signed-in player''s citizen, or not_authenticated / no_citizen.';

create function game.own_company(p_company_id bigint)
returns game.companies
language plpgsql
set search_path = ''
as $$
declare
  v_company game.companies;
begin
  select * into v_company from game.companies where id = p_company_id for update;
  if not found or v_company.owner_user_id is distinct from auth.uid() then
    raise exception 'not_your_company' using errcode = '42501';
  end if;
  return v_company;
end;
$$;
comment on function game.own_company(bigint) is 'Locks the company if the signed-in player owns it, or not_your_company.';

create function game.add_stock(p_company_id bigint, p_good_code text, p_quantity numeric)
returns void
language sql
set search_path = ''
as $$
  insert into game.company_stock (company_id, good_code, quantity)
  values (p_company_id, p_good_code, p_quantity)
  on conflict (company_id, good_code) do update set quantity = game.company_stock.quantity + excluded.quantity;
$$;

-- Turns the company's points into goods: raw materials at the region's yield, products as far as the
-- points and the input in stock allow. Returns what was made.
create function game.produce(p_company_id bigint)
returns numeric
language plpgsql
set search_path = ''
as $$
declare
  v_company game.companies;
  v_good game.goods;
  v_input numeric;
  v_units numeric;
begin
  select * into v_company from game.companies where id = p_company_id for update;
  select * into v_good from game.goods where code = v_company.good_code;

  if v_good.kind = 'raw' then
    v_units := round(v_company.points / v_good.points_per_unit * game.raw_yield(v_company.region_code, v_good.code), 2);
    update game.companies set points = 0 where id = p_company_id;
  else
    select coalesce(quantity, 0) into v_input
    from game.company_stock where company_id = p_company_id and good_code = v_good.input_good_code;
    v_units := least(floor(v_company.points / v_good.points_per_unit), floor(coalesce(v_input, 0) / v_good.input_per_unit));
    if v_units > 0 then
      update game.company_stock set quantity = quantity - v_units * v_good.input_per_unit
      where company_id = p_company_id and good_code = v_good.input_good_code;
      update game.companies set points = points - v_units * v_good.points_per_unit where id = p_company_id;
    end if;
  end if;

  if v_units > 0 then
    perform game.add_stock(p_company_id, v_good.code, v_units);
  end if;
  return v_units;
end;
$$;
comment on function game.produce(bigint) is 'Turns a company''s points into goods; keeps points waiting for inputs.';

-- API: founding and managing ----------------------------------------------------------------------------

create function public.found_company(p_name text, p_good_code text, p_region_code text, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'company:' || auth.uid()::text || ':' || p_key::text;
  v_name text := btrim(p_name);
  v_id bigint;
begin
  select id into v_id from game.companies where creation_key = v_key;
  if found then
    return v_id;
  end if;
  if char_length(v_name) not between 3 and 40 then
    raise exception 'company_name_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from game.goods where code = p_good_code)
     or p_good_code like 'weapon_q%' and p_good_code <> 'weapon_q1' then
    raise exception 'good_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from game.regions
                 where code = p_region_code and owner_country_code = v_citizen.country_code and is_enabled) then
    raise exception 'region_unavailable' using errcode = '22023';
  end if;

  perform game.post(
    'company_founded', v_key, auth.uid(),
    array[row(game.citizen_account(auth.uid(), 'GOLD'), game.system_account('sink', 'GOLD'),
              (game.param('company_found_gold') * 100)::bigint, 'company_founded', v_name)::game.ledger_leg]
  );
  begin
    insert into game.companies (name, owner_user_id, country_code, region_code, good_code, creation_key, created_at)
    values (v_name, auth.uid(), v_citizen.country_code, p_region_code, p_good_code, v_key, game.now())
    returning id into v_id;
  exception when unique_violation then
    raise exception 'company_name_taken' using errcode = '23505';
  end;
  perform game.company_account(v_id, v_citizen.country_code);
  return v_id;
end;
$$;
comment on function public.found_company(text, text, text, uuid) is 'Founds a company for 20 Gold in a region of the player''s country.';
grant execute on function public.found_company(text, text, text, uuid) to authenticated;

create function public.set_company_offer(p_company_id bigint, p_wage bigint, p_vacancies integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company game.companies := game.own_company(p_company_id);
begin
  if p_wage is null or p_wage < 0 or p_vacancies is null or p_vacancies < 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if p_wage < (select minimum_wage from game.country_policies where country_code = v_company.country_code) then
    raise exception 'wage_below_minimum' using errcode = '22023';
  end if;
  update game.companies
  set wage = p_wage,
      vacancies = least(p_vacancies, game.company_capacity(level)
                        - (select count(*)::integer from game.employments where company_id = p_company_id))
  where id = p_company_id;
end;
$$;
comment on function public.set_company_offer(bigint, bigint, integer) is 'Sets the wage for everyone and the open vacancies.';
grant execute on function public.set_company_offer(bigint, bigint, integer) to authenticated;

create function public.fund_company(p_company_id bigint, p_amount bigint, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company game.companies := game.own_company(p_company_id);
  v_account bigint := game.company_account(p_company_id, v_company.country_code);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  perform game.post(
    'company_funded', 'fund:' || auth.uid()::text || ':' || p_key::text, auth.uid(),
    array[row(game.citizen_account(auth.uid(), v_company.country_code), v_account, p_amount, 'company_funded', v_company.name)::game.ledger_leg]
  );
  return (select balance from game.accounts where id = v_account);
end;
$$;
comment on function public.fund_company(bigint, bigint, uuid) is 'Moves the owner''s Credit into the company''s cash.';
grant execute on function public.fund_company(bigint, bigint, uuid) to authenticated;

create function public.withdraw_from_company(p_company_id bigint, p_amount bigint, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company game.companies := game.own_company(p_company_id);
  v_account bigint := game.company_account(p_company_id, v_company.country_code);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  perform game.post(
    'company_withdrawal', 'withdraw:' || auth.uid()::text || ':' || p_key::text, auth.uid(),
    array[row(v_account, game.citizen_account(auth.uid(), v_company.country_code), p_amount, 'company_withdrawal', v_company.name)::game.ledger_leg]
  );
  return (select balance from game.accounts where id = v_account);
end;
$$;
comment on function public.withdraw_from_company(bigint, bigint, uuid) is 'Moves Credit from the company''s cash to its owner.';
grant execute on function public.withdraw_from_company(bigint, bigint, uuid) to authenticated;

create function public.upgrade_company(p_company_id bigint, p_key uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company game.companies := game.own_company(p_company_id);
begin
  if v_company.level >= 3 then
    raise exception 'max_level' using errcode = '22023';
  end if;
  perform game.post(
    'company_upgraded', 'upgrade:' || auth.uid()::text || ':' || p_key::text, auth.uid(),
    array[row(game.citizen_account(auth.uid(), 'GOLD'), game.system_account('sink', 'GOLD'),
              (game.param('company_level' || (v_company.level + 1)::text || '_gold') * 100)::bigint,
              'company_upgraded', v_company.name)::game.ledger_leg]
  );
  update game.companies set level = level + 1 where id = p_company_id;
  return v_company.level + 1;
end;
$$;
comment on function public.upgrade_company(bigint, uuid) is 'Raises the company level (more employees) for Gold.';
grant execute on function public.upgrade_company(bigint, uuid) to authenticated;

create function public.upgrade_company_quality(p_company_id bigint, p_key uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company game.companies := game.own_company(p_company_id);
  v_quality integer := (select quality from game.goods where code = v_company.good_code);
begin
  if v_quality is null then
    raise exception 'not_weapons' using errcode = '22023';
  end if;
  if v_quality >= 5 then
    raise exception 'max_quality' using errcode = '22023';
  end if;
  perform game.post(
    'company_quality', 'quality:' || auth.uid()::text || ':' || p_key::text, auth.uid(),
    array[row(game.citizen_account(auth.uid(), 'GOLD'), game.system_account('sink', 'GOLD'),
              (game.param('company_quality_gold_per_q') * v_quality * 100)::bigint,
              'company_quality', v_company.name)::game.ledger_leg]
  );
  update game.companies set good_code = 'weapon_q' || (v_quality + 1)::text where id = p_company_id;
  return v_quality + 1;
end;
$$;
comment on function public.upgrade_company_quality(bigint, uuid) is 'Raises a weapon company from Q to Q+1 for 20 × Q Gold.';
grant execute on function public.upgrade_company_quality(bigint, uuid) to authenticated;

create function public.list_my_companies()
returns table (
  id bigint, name text, good_code text, region_code text, level integer, capacity integer, wage bigint,
  vacancies integer, cash bigint, employees integer, points numeric, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.good_code, c.region_code, c.level, game.company_capacity(c.level), c.wage, c.vacancies,
         coalesce((select a.balance from game.accounts as a
                   where a.kind = 'company' and a.company_id = c.id and a.currency_code = c.country_code), 0),
         (select count(*)::integer from game.employments as e where e.company_id = c.id),
         c.points, c.created_at
  from game.companies as c
  where c.owner_user_id = auth.uid()
  order by c.created_at;
$$;
grant execute on function public.list_my_companies() to authenticated;

-- Consecutive game days, up to today, the player worked in this company.
create function game.work_streak(p_user_id uuid, p_company_id bigint)
returns integer
language sql
stable
set search_path = ''
as $$
  with days as (
    select game_day, game_day - (row_number() over (order by game_day))::integer as island
    from game.workdays
    where user_id = p_user_id and company_id = p_company_id
  )
  select coalesce((
    select count(*)::integer from days
    where island = (select island from days order by game_day desc limit 1)
      and (select max(game_day) from days) >= game.game_day() - 1
  ), 0);
$$;

create function public.get_company_employees(p_company_id bigint)
returns table (name text, hired_at timestamptz, worked_today boolean, streak integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, e.hired_at,
         exists (select 1 from game.workdays as w
                 where w.user_id = e.user_id and w.game_day = game.game_day() and w.company_id = e.company_id),
         game.work_streak(e.user_id, e.company_id)
  from game.employments as e
  join game.citizens as c on c.user_id = e.user_id
  where e.company_id = p_company_id
    and exists (select 1 from game.companies as co where co.id = p_company_id and co.owner_user_id = auth.uid())
  order by e.hired_at;
$$;
grant execute on function public.get_company_employees(bigint) to authenticated;

create function public.get_company_stock(p_company_id bigint)
returns table (good_code text, quantity numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select s.good_code, s.quantity
  from game.company_stock as s
  join game.companies as c on c.id = s.company_id
  where s.company_id = p_company_id and c.owner_user_id = auth.uid() and s.quantity > 0
  order by s.good_code;
$$;
grant execute on function public.get_company_stock(bigint) to authenticated;

create function public.list_goods()
returns table (code text, kind text, input_good_code text, input_per_unit numeric, points_per_unit numeric, quality integer, raw_yield numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select g.code, g.kind, g.input_good_code, g.input_per_unit, g.points_per_unit, g.quality,
         case when g.kind = 'raw' then game.param('raw_yield_base') end
  from game.goods as g
  order by g.kind desc, g.code;
$$;
comment on function public.list_goods() is 'Goods and recipes, for the economy screens. Public.';
grant execute on function public.list_goods() to anon, authenticated;

-- API: jobs and work ------------------------------------------------------------------------------------


create function public.list_job_offers()
returns table (company_id bigint, name text, good_code text, region_code text, wage bigint, vacancies integer, owner_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select co.id, co.name, co.good_code, co.region_code, co.wage, co.vacancies, owner.name
  from game.companies as co
  join game.citizens as me on me.user_id = auth.uid()
  join game.citizens as owner on owner.user_id = co.owner_user_id
  where co.country_code = me.country_code and co.vacancies > 0 and co.owner_user_id <> auth.uid()
  order by co.wage desc, co.id;
$$;
comment on function public.list_job_offers() is 'Companies of the player''s country with open vacancies, best paid first.';
grant execute on function public.list_job_offers() to authenticated;

create function public.take_job(p_company_id bigint)
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
comment on function public.take_job(bigint) is 'Takes an open vacancy in the player''s country; one job change per 24 hours.';
grant execute on function public.take_job(bigint) to authenticated;

create function public.leave_job()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
begin
  update game.job_history set left_at = game.now() where user_id = v_citizen.user_id and left_at is null;
  delete from game.employments where user_id = v_citizen.user_id;
end;
$$;
grant execute on function public.leave_job() to authenticated;

create function public.get_my_job()
returns table (
  company_id bigint, company_name text, good_code text, region_code text, owner_name text, wage bigint,
  work_tax numeric, streak integer, worked_today boolean, hired_at timestamptz, next_change_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select co.id, co.name, co.good_code, co.region_code, owner.name, co.wage, p.work_tax,
         game.work_streak(e.user_id, co.id),
         exists (select 1 from game.workdays as w where w.user_id = e.user_id and w.game_day = game.game_day()),
         e.hired_at,
         e.hired_at + make_interval(hours => game.param('job_change_hours')::integer)
  from game.employments as e
  join game.companies as co on co.id = e.company_id
  join game.citizens as owner on owner.user_id = co.owner_user_id
  join game.country_policies as p on p.country_code = co.country_code
  where e.user_id = auth.uid();
$$;
grant execute on function public.get_my_job() to authenticated;

create function public.get_my_workday()
returns table (company_id bigint, gross bigint, tax bigint, net bigint, produced numeric, good_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select w.company_id, w.gross, w.tax, w.gross - w.tax, w.produced, co.good_code
  from game.workdays as w
  join game.companies as co on co.id = w.company_id
  where w.user_id = auth.uid() and w.game_day = game.game_day();
$$;
comment on function public.get_my_workday() is 'Today''s payslip, if the player already worked.';
grant execute on function public.get_my_workday() to authenticated;

-- One workday: 10 energy, 10 points for the company and, for employees, the wage minus the work tax.
-- p_company_id: null works at the player's job; an own company works there without a wage.
create function public.work(p_company_id bigint, p_key uuid)
returns table (gross bigint, tax bigint, net bigint, energy integer, produced numeric, good_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := p_key::text;
  v_day date := game.game_day();
  v_company game.companies;
  v_employed bigint;
  v_gross bigint := 0;
  v_tax bigint := 0;
  v_energy integer;
  v_produced numeric;
begin
  -- The same request again returns its payslip.
  if exists (select 1 from game.workdays where user_id = v_citizen.user_id and idempotency_key = v_key) then
    return query
      select w.gross, w.tax, w.gross - w.tax,
             (select pr.energy from public.get_my_profile() as pr), w.produced, co.good_code
      from game.workdays as w join game.companies as co on co.id = w.company_id
      where w.user_id = v_citizen.user_id and w.idempotency_key = v_key;
    return;
  end if;
  if exists (select 1 from game.workdays where user_id = v_citizen.user_id and game_day = v_day) then
    raise exception 'already_worked' using errcode = '22023';
  end if;

  select company_id into v_employed from game.employments where user_id = v_citizen.user_id;
  if p_company_id is null then
    if v_employed is null then
      raise exception 'not_employed' using errcode = '22023';
    end if;
    select * into v_company from game.companies where id = v_employed for update;
  else
    select * into v_company from game.companies where id = p_company_id for update;
    if not found or (v_company.owner_user_id <> v_citizen.user_id and v_company.id is distinct from v_employed) then
      raise exception 'not_employed' using errcode = '22023';
    end if;
  end if;

  v_energy := game.spend_energy(v_citizen.user_id, game.param('work_energy')::integer);

  if v_company.owner_user_id <> v_citizen.user_id then
    v_gross := v_company.wage;
    v_tax := round(v_gross * (select work_tax from game.country_policies where country_code = v_company.country_code));
    if v_gross > 0 then
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
  end if;

  update game.companies set points = points + game.param('work_points') where id = v_company.id;
  v_produced := game.produce(v_company.id);

  insert into game.workdays (user_id, game_day, company_id, gross, tax, produced, idempotency_key, created_at)
  values (v_citizen.user_id, v_day, v_company.id, v_gross, v_tax, v_produced, v_key, game.now());

  return query select v_gross, v_tax, v_gross - v_tax, v_energy, v_produced, v_company.good_code;
end;
$$;
comment on function public.work(bigint, uuid) is 'Works once per game day: energy, points, wage minus work tax. Idempotent per key.';
grant execute on function public.work(bigint, uuid) to authenticated;
