-- H3 · Public hospitals: one per region N1–N5, built and upgraded with Health's GOLD, holding medical kits only,
-- free treatment with the lowest sufficient compatible kit, the national care policy, and stock visible only to the
-- Health minister and the president (spec section 7, ADR 0031).
--
-- game.hospitals            one per region: level N1–N5; it holds no money, only kits (holder kind hospital)
-- game.care_policies        each country's care policy (universal, nationals, non_enemies, allies) and its log
-- game.treatments           every treatment: hospital, kit used, health healed; one kit each, atomic
-- Kit choice: a level-N hospital uses Q ≤ N; the lowest quality that covers the missing health, otherwise the
-- best lower one in stock (partial recovery); the whole kit is spent.
-- Until enemies (W1) and alliances (W5) exist, non_enemies admits everyone and allies admits nationals only.
--
-- public.build_hospital, upgrade_hospital, move_kits, set_care_policy (Health minister); hospital_treatment
--   (patients in the region); list_hospitals, get_care_policy, list_care_policy_changes (public);
--   get_hospital_stock (Health minister and president)
--
-- Errors (ADR 0005): not_minister, region_invalid, hospital_exists, no_hospital, level_max, insufficient_funds,
-- good_invalid, quantity_unavailable, policy_invalid, not_eligible, health_full, no_compatible_kit.
--
-- Rollback: drop the public functions created here, game.treatments, game.care_policy_changes,
-- game.care_policies, game.hospitals, game.choose_kit, game.care_allowed, game.own_region, game.holder_for_hospital,
-- game.require_health_minister;
-- delete the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('hospital_build_gold', 5000, 'GOLD hundredths to build an N1 hospital (from Health, burned).'),
  ('hospital_upgrade_2', 7500, 'GOLD hundredths to raise a hospital to N2.'),
  ('hospital_upgrade_3', 10000, 'GOLD hundredths to raise a hospital to N3.'),
  ('hospital_upgrade_4', 12500, 'GOLD hundredths to raise a hospital to N4.'),
  ('hospital_upgrade_5', 15000, 'GOLD hundredths to raise a hospital to N5.'),
  ('hospital_level_max', 5, 'Highest hospital level.');

-- Hospitals ------------------------------------------------------------------------------------------------------

create table game.hospitals (
  region_code text primary key references game.regions (code),
  level integer not null default 1 check (level between 1 and 5),
  built_by uuid references game.citizens (user_id) on delete set null,
  built_at timestamptz not null,
  upgraded_at timestamptz
);
alter table game.hospitals enable row level security;
comment on table game.hospitals is 'At most one public hospital per region; run by the Health ministry of the region''s owner.';
create index hospitals_built_by_idx on game.hospitals (built_by) where built_by is not null;

create function game.holder_for_hospital(p_region_code text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into game.holders (kind, region_code, created_at) values ('hospital', p_region_code, game.now())
  on conflict (region_code) where kind = 'hospital' do nothing;
  select id into v_id from game.holders where kind = 'hospital' and region_code = p_region_code;
  return v_id;
end;
$$;
comment on function game.holder_for_hospital(text) is 'A hospital''s kit store, created on first use.';

-- The Health minister of the citizen's country.
create function game.require_health_minister(p_citizen game.citizens)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not game.holds_office(p_citizen.user_id, p_citizen.country_code, array['minister_health']) then
    raise exception 'not_minister' using errcode = '42501';
  end if;
end;
$$;

-- A region the citizen's country owns now.
create function game.own_region(p_citizen game.citizens, p_region_code text)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not exists (select 1 from game.regions where code = p_region_code and owner_country_code = p_citizen.country_code) then
    raise exception 'region_invalid' using errcode = '22023';
  end if;
end;
$$;

create function public.build_hospital(p_region_code text, p_key uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
begin
  perform game.require_health_minister(v_citizen);
  perform game.own_region(v_citizen, p_region_code);
  perform pg_advisory_xact_lock(hashtextextended('hospital:' || p_region_code, 0));
  if exists (select 1 from game.hospitals where region_code = p_region_code) then
    if p_key is not null and exists (select 1 from game.ledger_transactions
                                     where idempotency_key = 'hospital_build:' || p_key::text) then
      return;
    end if;
    raise exception 'hospital_exists' using errcode = '22023';
  end if;
  perform game.post(
    'hospital_construction', 'hospital_build:' || coalesce(p_key::text, gen_random_uuid()::text), v_citizen.user_id,
    array[row(game.ministry_account(v_citizen.country_code, 'health', 'GOLD'), game.system_account('sink', 'GOLD'),
              game.param('hospital_build_gold')::bigint, 'hospital_construction', p_region_code)::game.ledger_leg]
  );
  insert into game.hospitals (region_code, built_by, built_at) values (p_region_code, v_citizen.user_id, game.now());
end;
$$;
comment on function public.build_hospital(text, uuid) is 'The Health minister builds an N1 hospital in a region of the country, with Health''s GOLD.';
grant execute on function public.build_hospital(text, uuid) to authenticated;

create function public.upgrade_hospital(p_region_code text, p_key uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_level integer;
  v_done jsonb;
begin
  perform game.require_health_minister(v_citizen);
  perform game.own_region(v_citizen, p_region_code);
  select level into v_level from game.hospitals where region_code = p_region_code for update;
  if v_level is null then
    raise exception 'no_hospital' using errcode = 'P0002';
  end if;
  if p_key is not null then
    select request into v_done from game.ledger_transactions where idempotency_key = 'hospital_upgrade:' || p_key::text;
    if v_done is not null then
      return (v_done ->> 'level')::integer;
    end if;
  end if;
  if v_level >= game.param('hospital_level_max') then
    raise exception 'level_max' using errcode = '22023';
  end if;
  perform game.post(
    'hospital_construction', 'hospital_upgrade:' || coalesce(p_key::text, gen_random_uuid()::text), v_citizen.user_id,
    array[row(game.ministry_account(v_citizen.country_code, 'health', 'GOLD'), game.system_account('sink', 'GOLD'),
              game.param('hospital_upgrade_' || (v_level + 1)::text)::bigint, 'hospital_construction', p_region_code)::game.ledger_leg],
    jsonb_build_object('region_code', p_region_code, 'level', v_level + 1)
  );
  update game.hospitals set level = v_level + 1, upgraded_at = game.now() where region_code = p_region_code;
  return v_level + 1;
end;
$$;
comment on function public.upgrade_hospital(text, uuid) is 'The Health minister raises a hospital one level with Health''s GOLD.';
grant execute on function public.upgrade_hospital(text, uuid) to authenticated;

-- Moves kits instantly between Health's inventory (region null) and the country's hospitals. No transport.
create function public.move_kits(p_good_code text, p_quantity integer, p_from_region text default null, p_to_region text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_from bigint;
  v_to bigint;
begin
  perform game.require_health_minister(v_citizen);
  if not exists (select 1 from game.goods where code = p_good_code and category = 'medical' and heal is not null) then
    raise exception 'good_invalid' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_from_region is not distinct from p_to_region then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if p_from_region is null then
    v_from := game.holder_for_ministry(v_citizen.country_code, 'health');
  else
    perform game.own_region(v_citizen, p_from_region);
    if not exists (select 1 from game.hospitals where region_code = p_from_region) then
      raise exception 'no_hospital' using errcode = 'P0002';
    end if;
    v_from := game.holder_for_hospital(p_from_region);
  end if;
  if p_to_region is null then
    v_to := game.holder_for_ministry(v_citizen.country_code, 'health');
  else
    perform game.own_region(v_citizen, p_to_region);
    if not exists (select 1 from game.hospitals where region_code = p_to_region) then
      raise exception 'no_hospital' using errcode = 'P0002';
    end if;
    v_to := game.holder_for_hospital(p_to_region);
  end if;
  perform game.take_goods(v_from, p_good_code, p_quantity, 'kit_redistribution', 'health:' || v_citizen.country_code,
                          null, v_to);
end;
$$;
comment on function public.move_kits(text, integer, text, text) is
  'The Health minister moves kits between Health''s inventory and its hospitals, at once (no transport).';
grant execute on function public.move_kits(text, integer, text, text) to authenticated;

-- Care policy -----------------------------------------------------------------------------------------------------

create table game.care_policies (
  country_code text primary key references game.countries (code),
  policy text not null default 'universal' check (policy in ('universal', 'nationals', 'non_enemies', 'allies')),
  set_by uuid references game.citizens (user_id) on delete set null,
  set_at timestamptz
);
alter table game.care_policies enable row level security;
comment on table game.care_policies is 'Who a country''s public hospitals treat; universal until the Health minister sets it.';
create index care_policies_set_by_idx on game.care_policies (set_by) where set_by is not null;

create table game.care_policy_changes (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  policy text not null,
  set_by uuid references game.citizens (user_id) on delete set null,
  set_at timestamptz not null
);
alter table game.care_policy_changes enable row level security;
comment on table game.care_policy_changes is 'The log of care policy changes.';
create index care_policy_changes_country_idx on game.care_policy_changes (country_code, set_at);
create index care_policy_changes_set_by_idx on game.care_policy_changes (set_by) where set_by is not null;

create function public.set_care_policy(p_policy text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
begin
  perform game.require_health_minister(v_citizen);
  if p_policy is null or p_policy not in ('universal', 'nationals', 'non_enemies', 'allies') then
    raise exception 'policy_invalid' using errcode = '22023';
  end if;
  insert into game.care_policies (country_code, policy, set_by, set_at)
  values (v_citizen.country_code, p_policy, v_citizen.user_id, game.now())
  on conflict (country_code) do update set policy = excluded.policy, set_by = excluded.set_by, set_at = excluded.set_at;
  insert into game.care_policy_changes (country_code, policy, set_by, set_at)
  values (v_citizen.country_code, p_policy, v_citizen.user_id, game.now());
end;
$$;
comment on function public.set_care_policy(text) is 'The Health minister sets who the country''s hospitals treat, at once and logged.';
grant execute on function public.set_care_policy(text) to authenticated;

-- Whether a hospital of p_country treats a citizen of p_patient_country. Enemies (W1) and alliances (W5) do not
-- exist yet: non_enemies treats everyone and allies treats nationals.
create function game.care_allowed(p_country text, p_patient_country text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case coalesce((select policy from game.care_policies where country_code = p_country), 'universal')
    when 'universal' then true
    when 'non_enemies' then true
    else p_patient_country = p_country
  end;
$$;

-- Treatment ---------------------------------------------------------------------------------------------------------

create table game.treatments (
  id bigint generated always as identity primary key,
  region_code text not null references game.regions (code),
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  good_code text not null references game.goods (code),
  healed integer not null check (healed >= 0),
  health_after integer not null check (health_after between 0 and 100),
  idempotency_key text not null unique check (char_length(idempotency_key) <= 200),
  created_at timestamptz not null
);
alter table game.treatments enable row level security;
comment on table game.treatments is 'Free hospital treatments: one kit each, consumed and healed in the same transaction.';
create index treatments_user_idx on game.treatments (user_id, created_at);
create index treatments_region_idx on game.treatments (region_code, created_at);

-- The kit a hospital uses for p_missing health: the lowest quality ≤ its level that covers it, otherwise the best
-- lower one it has. Null when it has no compatible kit.
create function game.choose_kit(p_holder bigint, p_level integer, p_missing integer)
returns text
language sql
stable
set search_path = ''
as $$
  with stock as (
    select g.code, g.heal
    from game.goods as g
    where g.category = 'medical' and g.heal is not null and g.quality <= p_level
      and game.holder_quantity(p_holder, g.code) > 0
  )
  select coalesce(
    (select code from stock where heal >= p_missing order by heal limit 1),
    (select code from stock order by heal desc limit 1)
  );
$$;

create function public.hospital_treatment(p_key uuid)
returns table (good_code text, healed integer, health integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'treatment:' || auth.uid()::text || ':' || p_key::text;
  v_region game.regions;
  v_level integer;
  v_health integer;
  v_max integer := game.param('health_max')::integer;
  v_holder bigint;
  v_kit text;
  v_healed integer;
begin
  -- The patient's stats row serializes their treatments, so a repeated key finds the first one.
  select s.health into v_health from game.player_stats as s where s.user_id = v_citizen.user_id for update;
  if exists (select 1 from game.treatments as t where t.idempotency_key = v_key) then
    return query select t.good_code, t.healed, t.health_after from game.treatments as t where t.idempotency_key = v_key;
    return;
  end if;
  select * into v_region from game.regions where code = v_citizen.region_code;
  select h.level into v_level from game.hospitals as h where h.region_code = v_citizen.region_code;
  if v_level is null then
    raise exception 'no_hospital' using errcode = 'P0002';
  end if;
  if not game.care_allowed(v_region.owner_country_code, v_citizen.country_code) then
    raise exception 'not_eligible' using errcode = '42501';
  end if;
  if v_health >= v_max then
    raise exception 'health_full' using errcode = '22023';
  end if;
  v_holder := game.holder_for_hospital(v_region.code);
  -- One hospital serves one patient at a time, so two patients never take the same last kit.
  perform pg_advisory_xact_lock(hashtextextended('hospital:' || v_region.code, 0));
  v_kit := game.choose_kit(v_holder, v_level, v_max - v_health);
  if v_kit is null then
    raise exception 'no_compatible_kit' using errcode = '22023';
  end if;
  perform game.take_goods(v_holder, v_kit, 1, 'treatment', v_key);
  v_healed := least((select g.heal from game.goods as g where g.code = v_kit), v_max - v_health);
  update game.player_stats as s set health = s.health + v_healed where s.user_id = v_citizen.user_id;
  insert into game.treatments (region_code, user_id, good_code, healed, health_after, idempotency_key, created_at)
  values (v_region.code, v_citizen.user_id, v_kit, v_healed, v_health + v_healed, v_key, game.now());
  return query select v_kit, v_healed, v_health + v_healed;
end;
$$;
comment on function public.hospital_treatment(uuid) is
  'Free treatment at the hospital of the patient''s region: one kit, the lowest sufficient compatible quality.';
grant execute on function public.hospital_treatment(uuid) to authenticated;

-- Reads ---------------------------------------------------------------------------------------------------------------

create function public.list_hospitals(p_country_code text)
returns table (region_code text, level integer, built_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select h.region_code, h.level, h.built_at
  from game.hospitals as h
  join game.regions as r on r.code = h.region_code
  where r.owner_country_code = p_country_code
  order by h.region_code;
$$;
comment on function public.list_hospitals(text) is 'A country''s hospitals and their levels; never their stock.';
grant execute on function public.list_hospitals(text) to anon, authenticated;

create function public.get_care_policy(p_country_code text)
returns table (policy text, set_by_name text, set_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.policy, 'universal'), c.name, p.set_at
  from game.countries as co
  left join game.care_policies as p on p.country_code = co.code
  left join game.citizens as c on c.user_id = p.set_by
  where co.code = p_country_code;
$$;
comment on function public.get_care_policy(text) is 'Who a country''s hospitals treat.';
grant execute on function public.get_care_policy(text) to anon, authenticated;

create function public.list_care_policy_changes(p_country_code text)
returns table (policy text, set_by_name text, set_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select l.policy, c.name, l.set_at
  from game.care_policy_changes as l
  left join game.citizens as c on c.user_id = l.set_by
  where l.country_code = p_country_code
  order by l.set_at desc, l.id desc
  limit 20;
$$;
comment on function public.list_care_policy_changes(text) is 'The log of a country''s care policy.';
grant execute on function public.list_care_policy_changes(text) to anon, authenticated;

-- Kits per hospital (and in Health's own store, region null): Health minister and president only.
create function public.get_hospital_stock()
returns table (region_code text, good_code text, quantity numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
begin
  if not game.holds_office(v_citizen.user_id, v_citizen.country_code, array['president', 'minister_health']) then
    raise exception 'not_minister' using errcode = '42501';
  end if;
  return query
  select h.region_code, l.good_code, sum(l.quantity)
  from game.inventory_lots as l
  join game.holders as h on h.id = l.holder_id
  left join game.regions as r on r.code = h.region_code
  where l.quantity > 0
    and ((h.kind = 'hospital' and r.owner_country_code = v_citizen.country_code)
      or (h.kind = 'ministry' and h.country_code = v_citizen.country_code and h.ministry = 'health'))
  group by h.region_code, l.good_code
  order by h.region_code nulls first, l.good_code;
end;
$$;
comment on function public.get_hospital_stock() is 'Kits per hospital and in Health''s store: private to the Health minister and the president.';
grant execute on function public.get_hospital_stock() to authenticated;

-- The hospital of the player's region, whether it treats them, and their last treatments.
create function public.get_my_hospital()
returns table (region_code text, level integer, country_code text, policy text, eligible boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select h.region_code, h.level, r.owner_country_code,
         coalesce((select p.policy from game.care_policies as p where p.country_code = r.owner_country_code), 'universal'),
         game.care_allowed(r.owner_country_code, c.country_code)
  from game.citizens as c
  join game.hospitals as h on h.region_code = c.region_code
  join game.regions as r on r.code = h.region_code
  where c.user_id = auth.uid();
$$;
comment on function public.get_my_hospital() is 'The hospital where the player is, its level and whether it treats them; no rows without one.';
grant execute on function public.get_my_hospital() to authenticated;
