-- Admin console (owner's request; ADR 0049): staff accounts apart from players, GOLD prices and how each one is
-- split, every balance parameter, sanctions and the moderation tools.
--
-- Staff: game.admins gains a role (admin: the whole console; moderator: reports, citizens and sanctions). A staff
--   account is never a citizen: neither table accepts a user the other has, and an older admin row whose account
--   is a citizen grants nothing (game.staff_role). Admins add and remove staff by email; nobody changes their own.
-- GOLD prices: game.gold_prices holds what each GOLD payment costs and the share of it that goes to a country's
--   treasury (the rest leaves the game); game.gold_legs builds those postings for every payment. The prices move here
--   from game.balance_params, with the values they had; the fixed treasury amounts of the presidential ticket, the
--   party list and the market license become their percentage.
-- Parameters: admins change any balance parameter (except the closed beta, which has its own switch), audited.
-- Sanctions: a warning, a mute (no messages, articles, newspapers, picture or description) or a suspension (no
--   action at all: the request hook refuses every write), for some hours or for good; the player is told and sees it.
-- Moderation: searching citizens, a citizen's record, notes, hiding content directly, clearing a profile, renaming a
--   citizen or a company, party, regiment or newspaper; reports for moderators too.
--
-- Errors (ADR 0005): not_staff, not_admin, role_invalid, account_not_found, staff_self, staff_is_citizen,
-- staff_account, no_change, price_missing, price_invalid, share_invalid, reason_required, param_invalid,
-- param_managed, value_invalid, sanction_invalid, duration_invalid, admin_only, sanction_closed, citizen_not_found,
-- query_too_short, note_invalid, citizen_name_invalid, citizen_name_taken, name_invalid, name_taken, target_invalid,
-- muted, account_suspended.
--
-- Rollback: drop the public functions created here, the triggers and functions refuse_muted, keep_staff_apart and
-- keep_citizens_apart, game.staff_notes, game.sanctions and game.gold_prices (after putting its rows back into
-- game.balance_params with their old keys); drop game.admins.role; restore game.is_admin and public.admin_list_team
-- from 20261009164651, game.keep_citizen_name from 20261009153427, public.check_request from 20261029090000,
-- game.company_price, game.pay_company_price and public.list_my_companies from 20261014090000,
-- public.buy_market_license and public.get_market_license_terms from 20261014110000, public.found_party from
-- 20261016090000, game.open_party_candidacy from 20261017090000, public.train, public.upgrade_training_center and
-- public.get_my_training from 20261022090000, public.build_hospital and public.upgrade_hospital from 20261023090000,
-- game.bill_spending from 20261024090000, public.join_resistance from 20261026090000, public.admin_unhide from
-- 20261105090000, public.admin_resolve_report and public.admin_list_reports from 20261106090000.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Staff ------------------------------------------------------------------------------------------------------------

-- A small table; the default is a constant, so no rewrite.
alter table game.admins add column role text not null default 'admin';
alter table game.admins add constraint admins_role_check check (role in ('admin', 'moderator')) not valid;
-- A handful of rows: validating in the same transaction blocks nothing for long.
-- squawk-ignore constraint-missing-not-valid
alter table game.admins validate constraint admins_role_check;
comment on table game.admins is
  'The staff: accounts that run the game, never citizens. The first admin is added from the SQL editor (docs/setup.md).';
comment on column game.admins.role is 'admin: the whole console; moderator: reports, citizens and sanctions.';
-- squawk-ignore require-concurrent-index-creation
create index admins_added_by_idx on game.admins (added_by) where added_by is not null;

-- The role of a staff account; null for everyone else, and for an older admin row whose account is a citizen.
create function game.staff_role(p_user_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select a.role from game.admins as a
  where a.user_id = p_user_id and not exists (select 1 from game.citizens as c where c.user_id = a.user_id);
$$;
comment on function game.staff_role(uuid) is 'admin, moderator, or null: staff accounts are never citizens.';

create or replace function game.is_admin(p_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(game.staff_role(p_user_id) = 'admin', false);
$$;

create function game.require_staff()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  if auth.uid() is null or game.staff_role(auth.uid()) is null then
    raise exception 'not_staff' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;
comment on function game.require_staff() is 'The signed-in staff member (admin or moderator), or not_staff.';

create function game.keep_staff_apart()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from game.citizens where user_id = new.user_id) then
    raise exception 'staff_is_citizen' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger admins_not_citizens
before insert or update of user_id on game.admins
for each row execute function game.keep_staff_apart();

create function game.keep_citizens_apart()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from game.admins where user_id = new.user_id) then
    raise exception 'staff_account' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger citizens_not_staff
before insert on game.citizens
for each row execute function game.keep_citizens_apart();

create function public.get_my_staff()
returns table (role text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select game.staff_role(u.id), u.email::text
  from auth.users as u
  where u.id = auth.uid() and game.staff_role(u.id) is not null;
$$;
comment on function public.get_my_staff() is 'The signed-in account''s staff role and email, or no rows for players.';
grant execute on function public.get_my_staff() to authenticated;

-- The return type grows; only the admin console calls it and ships with this migration.
-- squawk-ignore ban-drop-function
drop function public.admin_list_team();
create function public.admin_list_team()
returns table (email text, role text, added_at timestamptz, added_by text, is_citizen boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select u.email::text, a.role, a.added_at, b.email::text,
         exists (select 1 from game.citizens as c where c.user_id = a.user_id)
  from game.admins as a
  join auth.users as u on u.id = a.user_id
  left join auth.users as b on b.id = a.added_by
  order by a.added_at;
end;
$$;
comment on function public.admin_list_team() is
  'Admins: the staff with their roles; a row whose account is a citizen grants nothing.';
grant execute on function public.admin_list_team() to authenticated;

-- Gives an account a staff role, or changes it. The account exists (created in Supabase Auth) and is no citizen.
create function public.admin_grant_staff(p_email text, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user uuid;
  v_before text;
begin
  if p_role is null or p_role not in ('admin', 'moderator') then
    raise exception 'role_invalid' using errcode = '22023';
  end if;
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;
  if v_user = v_admin then
    raise exception 'staff_self' using errcode = '22023';
  end if;
  if exists (select 1 from game.citizens where user_id = v_user) then
    raise exception 'staff_is_citizen' using errcode = '22023';
  end if;
  select role into v_before from game.admins where user_id = v_user for update;
  if v_before = p_role then
    raise exception 'no_change' using errcode = '22023';
  end if;
  insert into game.admins (user_id, role, added_by, added_at)
  values (v_user, p_role, v_admin, game.now())
  on conflict (user_id) do update set role = excluded.role;
  perform game.log_admin_action(v_admin, 'grant_staff', v_email,
                                case when v_before is null then null else jsonb_build_object('role', v_before) end,
                                jsonb_build_object('role', p_role));
end;
$$;
comment on function public.admin_grant_staff(text, text) is
  'Admins: makes an account (by email, not a citizen) an admin or a moderator, or changes its role. Audited.';
grant execute on function public.admin_grant_staff(text, text) to authenticated;

create function public.admin_revoke_staff(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_row game.admins;
begin
  select a.* into v_row from game.admins as a join auth.users as u on u.id = a.user_id
  where lower(u.email) = v_email
  for update of a;
  if not found then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;
  if v_row.user_id = v_admin then
    raise exception 'staff_self' using errcode = '22023';
  end if;
  delete from game.admins where user_id = v_row.user_id;
  perform game.log_admin_action(v_admin, 'revoke_staff', v_email, jsonb_build_object('role', v_row.role), null);
end;
$$;
comment on function public.admin_revoke_staff(text) is 'Admins: takes the staff role away from an account (never their own). Audited.';
grant execute on function public.admin_revoke_staff(text) to authenticated;

-- GOLD prices ------------------------------------------------------------------------------------------------------

create table game.gold_prices (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{2,60}$'),
  category text not null check (category in ('companies', 'politics', 'training', 'health', 'war', 'market')),
  position integer not null,
  -- GOLD hundredths.
  price bigint not null check (price >= 0 and price <= 1000000000),
  -- Payments whose retries are recognised by their ledger transaction cannot be free.
  min_price bigint not null default 1 check (min_price >= 0),
  -- Whose treasury receives the country's share: the company's host, the market's country, the party's country,
  -- the payer's country, the country a resistance restores, or nobody (the state pays it itself).
  beneficiary text not null
    check (beneficiary in ('none', 'host_country', 'market_country', 'party_country', 'citizen_country',
                           'restore_country')),
  -- Basis points (1/100 of a percent) of the price that go to that treasury; the rest leaves the game.
  country_share_bp integer not null default 0 check (country_share_bp between 0 and 10000),
  description text not null,
  updated_at timestamptz not null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint gold_prices_price_floor check (price >= min_price),
  constraint gold_prices_share_needs_country check (beneficiary <> 'none' or country_share_bp = 0)
);
alter table game.gold_prices enable row level security;
comment on table game.gold_prices is
  'What each GOLD payment costs and how it is split between a country''s treasury and the game (burned).';
create index gold_prices_updated_by_idx on game.gold_prices (updated_by) where updated_by is not null;

insert into game.gold_prices (key, category, position, price, min_price, beneficiary, country_share_bp, description,
                              updated_at)
select v.key, v.category, v.position, (game.param(v.param) * v.factor)::bigint, v.min_price, v.beneficiary,
       case when v.share_param is null or game.param(v.param) = 0 then 0
            else round(game.param(v.share_param) * 10000 / game.param(v.param))::integer end,
       v.description, now()
from (values
  ('company_level_1', 'companies', 10, 'company_level1_gold', 100, 1, 'host_country', null, 'Founding an N1 company.'),
  ('company_level_2', 'companies', 20, 'company_level2_gold', 100, 1, 'host_country', null, 'Upgrading a company to N2.'),
  ('company_level_3', 'companies', 30, 'company_level3_gold', 100, 1, 'host_country', null, 'Upgrading a company to N3.'),
  ('company_level_4', 'companies', 40, 'company_level4_gold', 100, 1, 'host_country', null, 'Upgrading a company to N4.'),
  ('company_level_5', 'companies', 50, 'company_level5_gold', 100, 1, 'host_country', null, 'Upgrading a company to N5.'),
  ('party_founding', 'politics', 10, 'party_founding_gold', 1, 1, 'party_country', null, 'Founding a party.'),
  ('presidential_ticket', 'politics', 20, 'presidential_ticket_gold', 1, 1, 'party_country',
   'presidential_ticket_treasury', 'A party registering its presidential ticket.'),
  ('party_list', 'politics', 30, 'party_list_gold', 1, 1, 'party_country', 'party_list_treasury',
   'A party registering its list for Congress.'),
  ('training_session_basic', 'training', 10, 'training_fee_basic', 1, 0, 'citizen_country', null,
   'A Basic training session.'),
  ('training_session_advanced', 'training', 20, 'training_fee_advanced', 1, 0, 'citizen_country', null,
   'An Advanced training session.'),
  ('training_session_elite', 'training', 30, 'training_fee_elite', 1, 0, 'citizen_country', null,
   'An Elite training session.'),
  ('training_center_2', 'training', 40, 'training_upgrade_2', 1, 1, 'citizen_country', null,
   'Raising a training center to N2.'),
  ('training_center_3', 'training', 50, 'training_upgrade_3', 1, 1, 'citizen_country', null,
   'Raising a training center to N3.'),
  ('training_center_4', 'training', 60, 'training_upgrade_4', 1, 1, 'citizen_country', null,
   'Raising a training center to N4.'),
  ('training_center_5', 'training', 70, 'training_upgrade_5', 1, 1, 'citizen_country', null,
   'Raising a training center to N5.'),
  ('hospital_build', 'health', 10, 'hospital_build_gold', 1, 1, 'none', null, 'Building an N1 hospital (Health pays).'),
  ('hospital_upgrade_2', 'health', 20, 'hospital_upgrade_2', 1, 1, 'none', null, 'Raising a hospital to N2.'),
  ('hospital_upgrade_3', 'health', 30, 'hospital_upgrade_3', 1, 1, 'none', null, 'Raising a hospital to N3.'),
  ('hospital_upgrade_4', 'health', 40, 'hospital_upgrade_4', 1, 1, 'none', null, 'Raising a hospital to N4.'),
  ('hospital_upgrade_5', 'health', 50, 'hospital_upgrade_5', 1, 1, 'none', null, 'Raising a hospital to N5.'),
  ('war_authorization', 'war', 10, 'war_authorization_gold', 1, 1, 'none', null,
   'A war authorization (the Treasury pays when the offensive starts).'),
  ('resistance_organizer', 'war', 20, 'resistance_fee', 1, 1, 'restore_country', null,
   'Each organizer of a resistance.'),
  ('market_license', 'market', 10, 'market_license_price', 1, 1, 'market_country', 'market_license_country_share',
   'A license to trade in another country''s market.')
) as v (key, category, position, param, factor, min_price, beneficiary, share_param, description);

delete from game.balance_params where key in (
  'company_level1_gold', 'company_level2_gold', 'company_level3_gold', 'company_level4_gold', 'company_level5_gold',
  'party_founding_gold', 'presidential_ticket_gold', 'presidential_ticket_treasury', 'party_list_gold',
  'party_list_treasury', 'training_fee_basic', 'training_fee_advanced', 'training_fee_elite', 'training_upgrade_2',
  'training_upgrade_3', 'training_upgrade_4', 'training_upgrade_5', 'hospital_build_gold', 'hospital_upgrade_2',
  'hospital_upgrade_3', 'hospital_upgrade_4', 'hospital_upgrade_5', 'war_authorization_gold', 'resistance_fee',
  'market_license_price', 'market_license_country_share'
);

create function game.gold_price(p_key text)
returns bigint
language plpgsql
stable
set search_path = ''
as $$
declare
  v_price bigint;
begin
  select price into v_price from game.gold_prices where key = p_key;
  if not found then
    raise exception 'price_missing' using errcode = 'P0002', detail = p_key;
  end if;
  return v_price;
end;
$$;
comment on function game.gold_price(text) is 'What a GOLD payment costs, in hundredths.';

-- The country's share of a price, in hundredths (rounded down: the game keeps the remainder).
create function game.gold_country_share(p_price game.gold_prices)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case when p_price.beneficiary = 'none' then 0::bigint
              else p_price.price * p_price.country_share_bp / 10000 end;
$$;

-- The postings of a GOLD payment from an account: the country's share to its treasury, the rest burned. A free price
-- has no postings.
create function game.gold_legs(p_key text, p_payer bigint, p_country_code text, p_kind text, p_memo text)
returns game.ledger_leg[]
language plpgsql
set search_path = ''
as $$
declare
  v_price game.gold_prices;
  v_share bigint;
  v_legs game.ledger_leg[] := '{}';
begin
  select * into v_price from game.gold_prices where key = p_key;
  if not found then
    raise exception 'price_missing' using errcode = 'P0002', detail = p_key;
  end if;
  v_share := case when p_country_code is null then 0 else game.gold_country_share(v_price) end;
  if v_share > 0 then
    v_legs := v_legs || row(p_payer, game.treasury_account(p_country_code, 'GOLD'), v_share, p_kind, p_memo)::game.ledger_leg;
  end if;
  if v_price.price - v_share > 0 then
    v_legs := v_legs || row(p_payer, game.system_account('sink', 'GOLD'), v_price.price - v_share, p_kind,
                            p_memo)::game.ledger_leg;
  end if;
  return v_legs;
end;
$$;
comment on function game.gold_legs(text, bigint, text, text, text) is
  'The postings of a GOLD payment: the country''s share to its treasury, the rest burned (game.gold_prices).';

create function public.get_gold_prices()
returns table (key text, category text, price bigint, beneficiary text, country_share_bp integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.key, p.category, p.price, p.beneficiary, p.country_share_bp
  from game.gold_prices as p
  order by p.category, p.position;
$$;
comment on function public.get_gold_prices() is 'What every GOLD payment costs and the share each country receives.';
grant execute on function public.get_gold_prices() to anon, authenticated;

create function public.admin_list_gold_prices()
returns table (key text, category text, price bigint, min_price bigint, beneficiary text, country_share_bp integer,
               description text, updated_at timestamptz, updated_by text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select p.key, p.category, p.price, p.min_price, p.beneficiary, p.country_share_bp, p.description, p.updated_at,
         u.email::text
  from game.gold_prices as p
  left join auth.users as u on u.id = p.updated_by
  order by p.category, p.position;
end;
$$;
comment on function public.admin_list_gold_prices() is 'Admins: every GOLD price with its split and its last change.';
grant execute on function public.admin_list_gold_prices() to authenticated;

-- Sets a price and its country share; applies to the next payment. Audited with the reason.
create function public.admin_set_gold_price(p_key text, p_price bigint, p_country_share_bp integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_row game.gold_prices;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  select * into v_row from game.gold_prices where key = p_key for update;
  if not found then
    raise exception 'price_missing' using errcode = 'P0002';
  end if;
  if p_price is null or p_price < v_row.min_price or p_price > 1000000000 then
    raise exception 'price_invalid' using errcode = '22023';
  end if;
  if p_country_share_bp is null or p_country_share_bp not between 0 and 10000
     or (v_row.beneficiary = 'none' and p_country_share_bp <> 0) then
    raise exception 'share_invalid' using errcode = '22023';
  end if;
  if char_length(v_reason) not between 3 and 300 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  if v_row.price = p_price and v_row.country_share_bp = p_country_share_bp then
    raise exception 'no_change' using errcode = '22023';
  end if;
  update game.gold_prices
  set price = p_price, country_share_bp = p_country_share_bp, updated_at = game.now(), updated_by = v_admin
  where key = p_key;
  perform game.log_admin_action(
    v_admin, 'set_gold_price', p_key,
    jsonb_build_object('price', v_row.price, 'country_share_bp', v_row.country_share_bp),
    jsonb_build_object('price', p_price, 'country_share_bp', p_country_share_bp, 'reason', v_reason)
  );
end;
$$;
comment on function public.admin_set_gold_price(text, bigint, integer, text) is
  'Admins: sets what a GOLD payment costs and the share of it its country receives. Audited.';
grant execute on function public.admin_set_gold_price(text, bigint, integer, text) to authenticated;

-- Every GOLD payment reads its price and split -------------------------------------------------------------------------

create or replace function game.company_price(p_level integer, p_owner_country text, p_host_country text)
returns table (base bigint, surcharge bigint)
language sql
stable
set search_path = ''
as $$
  select game.gold_price('company_level_' || p_level::text),
         case when p_owner_country = p_host_country then 0::bigint
              else round(game.gold_price('company_level_' || p_level::text)
                         * (select foreign_construction_surcharge from game.country_policies
                            where country_code = p_host_country))::bigint end;
$$;

-- Pays a company price: the host's share to its treasury, the rest burned, and a foreign owner's surcharge to the host.
create or replace function game.pay_company_price(
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
  v_legs := game.gold_legs('company_level_' || p_level::text, game.citizen_account(p_user_id, 'GOLD'), p_host_country,
                           p_kind, p_memo);
  if v_price.surcharge > 0 then
    v_legs := v_legs || row(game.citizen_account(p_user_id, 'GOLD'), game.treasury_account(p_host_country, 'GOLD'),
                            v_price.surcharge, 'construction_surcharge', p_memo)::game.ledger_leg;
  end if;
  perform game.post(p_kind, p_key, p_user_id, v_legs);
end;
$$;

create or replace function public.buy_market_license(p_market_country_code text, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'license:' || auth.uid()::text || ':' || p_key::text;
  v_payer bigint;
  v_id bigint;
begin
  if not exists (select 1 from game.countries where code = p_market_country_code and is_active) then
    raise exception 'market_invalid' using errcode = '22023';
  end if;
  if p_market_country_code = v_citizen.country_code then
    raise exception 'license_not_needed' using errcode = '22023';
  end if;
  -- One license per market and player: the row lock makes a second purchase wait and then find it.
  perform 1 from game.citizens where user_id = v_citizen.user_id for update;
  select id into v_id from game.market_access_licenses
  where user_id = v_citizen.user_id and market_country_code = p_market_country_code;
  if found then
    return v_id;
  end if;

  v_payer := game.citizen_account(v_citizen.user_id, 'GOLD');
  perform game.post('market_license', v_key, v_citizen.user_id,
                    game.gold_legs('market_license', v_payer, p_market_country_code, 'market_license', null));
  insert into game.market_access_licenses (user_id, market_country_code, granted_at)
  values (v_citizen.user_id, p_market_country_code, game.now())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.get_market_license_terms()
returns table (price bigint, country_share bigint, required boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.price, game.gold_country_share(p), game.param('market_foreign_license_required') > 0
  from game.gold_prices as p
  where p.key = 'market_license';
$$;

create or replace function public.found_party(p_name text, p_description text, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'party:' || auth.uid()::text || ':' || p_key::text;
  v_name text := btrim(coalesce(p_name, ''));
  v_id bigint;
begin
  select id into v_id from game.parties where creation_key = v_key;
  if found then
    return v_id;
  end if;
  if char_length(v_name) not between 3 and 40 or char_length(coalesce(p_description, '')) > 160 then
    raise exception 'party_name_invalid' using errcode = '22023';
  end if;
  perform 1 from game.citizens where user_id = v_citizen.user_id for update;
  if exists (select 1 from game.party_memberships where user_id = v_citizen.user_id) then
    raise exception 'already_in_party' using errcode = '22023';
  end if;
  if exists (select 1 from game.parties where country_code = v_citizen.country_code and lower(name) = lower(v_name)) then
    raise exception 'party_name_taken' using errcode = '22023';
  end if;

  insert into game.parties (country_code, name, description, founder_user_id, leader_user_id, creation_key, founded_at)
  values (v_citizen.country_code, v_name, btrim(coalesce(p_description, '')), v_citizen.user_id, v_citizen.user_id,
          v_key, game.now())
  returning id into v_id;
  -- The founding price: the country's share to its treasury, the rest leaves the game.
  perform game.post(
    'party_founding', v_key, v_citizen.user_id,
    game.gold_legs('party_founding', game.citizen_account(v_citizen.user_id, 'GOLD'), v_citizen.country_code,
                   'party_founding', null)
  );
  insert into game.party_memberships (user_id, party_id, joined_at) values (v_citizen.user_id, v_id, game.now());
  perform game.party_election(v_id);
  return v_id;
exception when unique_violation then
  raise exception 'party_name_taken' using errcode = '22023';
end;
$$;
comment on function public.found_party(text, text, uuid) is
  'Founds a party in the player''s country for its GOLD price; the founder is its first member and leader.';

create or replace function game.open_party_candidacy(p_party game.parties, p_kind text, p_actor uuid)
returns game.candidacies
language plpgsql
set search_path = ''
as $$
declare
  v_election game.elections;
  v_election_id bigint := game.national_election(p_party.country_code, p_kind);
  v_candidacy game.candidacies;
begin
  select * into v_election from game.elections where id = v_election_id for update;
  if game.now() < v_election.registration_opens_at or game.now() >= v_election.registration_closes_at then
    raise exception 'registration_closed' using errcode = '22023';
  end if;
  select * into v_candidacy from game.candidacies where election_id = v_election.id and party_id = p_party.id;
  if found and v_candidacy.withdrawn_at is null then
    return v_candidacy;
  end if;
  perform game.post(
    case p_kind when 'president' then 'presidential_ticket' else 'party_list' end,
    'candidacy_fee:' || v_election.id::text || ':' || p_party.id::text || ':' || clock_timestamp()::text, p_actor,
    game.gold_legs(case p_kind when 'president' then 'presidential_ticket' else 'party_list' end,
                   game.party_account(p_party.id, 'GOLD'), p_party.country_code, 'candidacy_fee', null)
  );
  if v_candidacy.id is null then
    insert into game.candidacies (election_id, party_id, registered_at)
    values (v_election.id, p_party.id, game.now())
    returning * into v_candidacy;
  else
    update game.candidacies set withdrawn_at = null, registered_at = game.now()
    where id = v_candidacy.id
    returning * into v_candidacy;
  end if;
  return v_candidacy;
end;
$$;

create or replace function public.train(p_kind text)
returns table (strength_gained integer, xp_gained integer, health_lost integer, health integer, energy integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_day date := game.game_day();
  v_level integer;
  v_energy integer;
  v_fee bigint;
  v_strength integer;
  v_lost integer := 0;
  v_left integer;
begin
  if p_kind is null or p_kind not in ('basic', 'advanced', 'elite') then
    raise exception 'center_invalid' using errcode = '22023';
  end if;
  -- The player's stats row serializes their sessions.
  perform 1 from game.player_stats as s where s.user_id = v_citizen.user_id for update;
  if exists (select 1 from game.training_sessions as t
             where t.user_id = v_citizen.user_id and t.kind = p_kind and t.game_day = v_day) then
    raise exception 'already_trained' using errcode = '22023';
  end if;
  if (select s.health from game.player_stats as s where s.user_id = v_citizen.user_id) <= 0 then
    raise exception 'health_zero' using errcode = '22023';
  end if;

  v_level := game.center_level(v_citizen.user_id, p_kind);
  v_left := game.spend_energy(v_citizen.user_id, game.param('training_energy_' || p_kind)::integer);
  v_fee := game.gold_price('training_session_' || p_kind);
  if v_fee > 0 then
    perform game.post(
      'training_fee', 'training:' || v_citizen.user_id::text || ':' || p_kind || ':' || v_day::text, v_citizen.user_id,
      game.gold_legs('training_session_' || p_kind, game.citizen_account(v_citizen.user_id, 'GOLD'),
                     v_citizen.country_code, 'training_fee', null)
    );
  end if;
  v_strength := game.param('training_strength_' || p_kind)::integer * v_level;
  update game.player_stats as s set strength = s.strength + v_strength where s.user_id = v_citizen.user_id;
  perform game.add_civil_xp(v_citizen.user_id, v_strength);
  if game.random() < v_level * game.param('training_injury_per_level') then
    v_lost := game.injure(v_citizen.user_id, 'training', p_kind, game.param('training_injury_hp')::integer);
  end if;

  insert into game.training_sessions (user_id, kind, game_day, center_level, energy_spent, fee, strength_gained,
                                      xp_gained, health_lost, created_at)
  values (v_citizen.user_id, p_kind, v_day, v_level, game.param('training_energy_' || p_kind)::integer, v_fee,
          v_strength, v_strength, v_lost, game.now());
  return query
  select v_strength, v_strength, v_lost, s.health, v_left from game.player_stats as s where s.user_id = v_citizen.user_id;
end;
$$;

create or replace function public.upgrade_training_center(p_kind text, p_key uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_level integer;
  v_target integer := null;
begin
  if p_kind is null or p_kind not in ('basic', 'advanced', 'elite') then
    raise exception 'center_invalid' using errcode = '22023';
  end if;
  insert into game.training_centers (user_id, kind) values (v_citizen.user_id, p_kind) on conflict do nothing;
  select level into v_level from game.training_centers where user_id = v_citizen.user_id and kind = p_kind for update;
  -- A repeated key returns the level it reached.
  if p_key is not null then
    select (t.request ->> 'level')::integer into v_target from game.ledger_transactions as t
    where t.idempotency_key = 'training_upgrade:' || v_citizen.user_id::text || ':' || p_key::text;
    if v_target is not null then
      return v_target;
    end if;
  end if;
  if v_level >= game.param('training_level_max') then
    raise exception 'level_max' using errcode = '22023';
  end if;
  perform game.post(
    'training_upgrade', 'training_upgrade:' || v_citizen.user_id::text || ':' || coalesce(p_key::text, gen_random_uuid()::text),
    v_citizen.user_id,
    game.gold_legs('training_center_' || (v_level + 1)::text, game.citizen_account(v_citizen.user_id, 'GOLD'),
                   v_citizen.country_code, 'training_upgrade', p_kind),
    jsonb_build_object('kind', p_kind, 'level', v_level + 1)
  );
  update game.training_centers set level = v_level + 1, upgraded_at = game.now()
  where user_id = v_citizen.user_id and kind = p_kind;
  return v_level + 1;
end;
$$;
comment on function public.upgrade_training_center(text, uuid) is
  'Raises a training center one level for its GOLD price (the country''s share, the rest burned).';

create or replace function public.get_my_training()
returns table (
  kind text, level integer, trained_today boolean, energy integer, fee bigint, strength integer,
  injury_chance numeric, upgrade_cost bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select k.kind, game.center_level(auth.uid(), k.kind),
         exists (select 1 from game.training_sessions as t
                 where t.user_id = auth.uid() and t.kind = k.kind and t.game_day = game.game_day()),
         game.param('training_energy_' || k.kind)::integer,
         game.gold_price('training_session_' || k.kind),
         game.param('training_strength_' || k.kind)::integer * game.center_level(auth.uid(), k.kind),
         game.center_level(auth.uid(), k.kind) * game.param('training_injury_per_level'),
         case when game.center_level(auth.uid(), k.kind) < game.param('training_level_max')
              then game.gold_price('training_center_' || (game.center_level(auth.uid(), k.kind) + 1)::text) end
  from (values ('basic', 1), ('advanced', 2), ('elite', 3)) as k (kind, position)
  where exists (select 1 from game.citizens where user_id = auth.uid())
  order by k.position;
$$;

create or replace function public.build_hospital(p_region_code text, p_key uuid)
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
    game.gold_legs('hospital_build', game.ministry_account(v_citizen.country_code, 'health', 'GOLD'), null,
                   'hospital_construction', p_region_code)
  );
  insert into game.hospitals (region_code, built_by, built_at) values (p_region_code, v_citizen.user_id, game.now());
end;
$$;

create or replace function public.upgrade_hospital(p_region_code text, p_key uuid)
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
    game.gold_legs('hospital_upgrade_' || (v_level + 1)::text,
                   game.ministry_account(v_citizen.country_code, 'health', 'GOLD'), null, 'hospital_construction',
                   p_region_code),
    jsonb_build_object('region_code', p_region_code, 'level', v_level + 1)
  );
  update game.hospitals set level = v_level + 1, upgraded_at = game.now() where region_code = p_region_code;
  return v_level + 1;
end;
$$;

create or replace function game.bill_spending(p_country_code text, p_kind text, p_terms jsonb)
returns table (currency_code text, amount bigint)
language sql
stable
set search_path = ''
as $$
  select s.currency_code, s.amount
  from (values
    ('GOLD', case when p_kind = 'gold_transfer' then (p_terms ->> 'amount')::bigint
                  when p_kind in ('ministry_allocation', 'central_bank_allocation') then (p_terms ->> 'gold')::bigint
                  when p_kind = 'war_authorization' then game.gold_price('war_authorization') end),
    (p_country_code, case when p_kind in ('ministry_allocation', 'central_bank_allocation')
                          then (p_terms ->> 'credit')::bigint end)
  ) as s (currency_code, amount)
  where s.amount > 0;
$$;

create or replace function public.join_resistance(p_region_code text, p_key uuid)
returns table (organizers integer, battle_id bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_occupation record;
  v_drive game.resistance_drives;
  v_count integer;
  v_battle bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('region_battle:' || coalesce(p_region_code, ''), 0));
  if not exists (select 1 from game.regions where code = p_region_code) then
    raise exception 'region_invalid' using errcode = '22023';
  end if;
  perform game.settle_battles();
  select * into v_occupation from game.occupation(p_region_code);
  if v_occupation.restore_country_code is null then
    raise exception 'not_occupied' using errcode = '22023';
  end if;
  if exists (select 1 from game.battles as b where b.region_code = p_region_code and b.status = 'active') then
    raise exception 'battle_active' using errcode = '22023';
  end if;
  select * into v_drive from game.resistance_drives as d where d.region_code = p_region_code and d.status = 'gathering';
  if not found then
    insert into game.resistance_drives (region_code, restore_country_code, occupier_country_code, created_at)
    values (p_region_code, v_occupation.restore_country_code, v_occupation.occupier_country_code, game.now())
    returning * into v_drive;
  end if;
  if exists (select 1 from game.resistance_organizers as o where o.drive_id = v_drive.id and o.user_id = v_citizen.user_id) then
    raise exception 'already_organizer' using errcode = '22023';
  end if;

  perform game.post(
    'resistance_fee', 'resistance:' || v_drive.id::text || ':' || v_citizen.user_id::text, v_citizen.user_id,
    game.gold_legs('resistance_organizer', game.citizen_account(v_citizen.user_id, 'GOLD'),
                   v_drive.restore_country_code, 'resistance_fee', p_region_code)
  );
  insert into game.resistance_organizers (drive_id, user_id, joined_at) values (v_drive.id, v_citizen.user_id, game.now());
  select count(*)::integer into v_count from game.resistance_organizers as o where o.drive_id = v_drive.id;

  if v_count >= game.param('resistance_organizers') then
    insert into game.battles (region_code, kind, attacker_country_code, defender_country_code, launched_by, started_at)
    values (p_region_code, 'resistance', v_drive.restore_country_code, v_drive.occupier_country_code, v_citizen.user_id,
            game.now())
    returning id into v_battle;
    update game.resistance_drives set status = 'started', battle_id = v_battle, started_at = game.now()
    where id = v_drive.id;
  end if;
  return query select v_count, v_battle;
end;
$$;
comment on function public.join_resistance(text, uuid) is
  'Joins the resistance of an occupied region for its GOLD price; the tenth organizer starts the battle at once.';

-- Balance parameters -------------------------------------------------------------------------------------------------

create function public.admin_list_params()
returns table (key text, value numeric, description text, updated_at timestamptz, managed boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select p.key, p.value, p.description, p.updated_at, p.key = 'closed_beta'
  from game.balance_params as p
  order by p.key;
end;
$$;
comment on function public.admin_list_params() is 'Admins: every balance parameter; managed ones have their own switch.';
grant execute on function public.admin_list_params() to authenticated;

-- Changes a balance parameter at once. Audited with the reason.
create function public.admin_set_param(p_key text, p_value numeric, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_before numeric;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  select value into v_before from game.balance_params where key = p_key for update;
  if not found then
    raise exception 'param_invalid' using errcode = 'P0002';
  end if;
  if p_key = 'closed_beta' then
    raise exception 'param_managed' using errcode = '22023';
  end if;
  if p_value is null or p_value < 0 or p_value > 1000000000 then
    raise exception 'value_invalid' using errcode = '22023';
  end if;
  if char_length(v_reason) not between 3 and 300 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  if v_before = p_value then
    raise exception 'no_change' using errcode = '22023';
  end if;
  update game.balance_params set value = p_value, updated_at = game.now() where key = p_key;
  perform game.log_admin_action(v_admin, 'set_param', p_key, jsonb_build_object('value', v_before),
                                jsonb_build_object('value', p_value, 'reason', v_reason));
end;
$$;
comment on function public.admin_set_param(text, numeric, text) is 'Admins: changes a balance parameter. Audited.';
grant execute on function public.admin_set_param(text, numeric, text) to authenticated;

-- Sanctions ----------------------------------------------------------------------------------------------------------

create table game.sanctions (
  id bigint generated always as identity primary key,
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  kind text not null check (kind in ('warning', 'mute', 'suspension')),
  reason text not null check (reason in ('spam', 'abuse', 'hate', 'cheating', 'multi_account', 'name', 'other')),
  -- Shown to the player.
  note text not null default '' check (char_length(note) <= 500),
  starts_at timestamptz not null,
  -- Null: for good. A warning has no end and is never in force.
  ends_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  revoke_note text check (char_length(revoke_note) <= 300),
  constraint sanctions_ends_after_start check (ends_at is null or ends_at > starts_at),
  constraint sanctions_warning_no_end check (kind <> 'warning' or ends_at is null)
);
alter table game.sanctions enable row level security;
comment on table game.sanctions is 'Warnings, mutes and suspensions of citizens, with who set or lifted them. Kept for the record.';
create index sanctions_user_idx on game.sanctions (user_id, starts_at desc);
create index sanctions_live_idx on game.sanctions (kind, ends_at) where revoked_at is null;
create index sanctions_created_by_idx on game.sanctions (created_by) where created_by is not null;
create index sanctions_revoked_by_idx on game.sanctions (revoked_by) where revoked_by is not null;

-- Whether a mute or a suspension is in force; a suspension also mutes.
create function game.sanction_active(p_user_id uuid, p_kind text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from game.sanctions as s
    where s.user_id = p_user_id and s.revoked_at is null and s.kind <> 'warning'
      and (s.kind = p_kind or (p_kind = 'mute' and s.kind = 'suspension'))
      and s.starts_at <= game.now() and (s.ends_at is null or s.ends_at > game.now())
  );
$$;
comment on function game.sanction_active(uuid, text) is 'Whether a citizen is muted or suspended now (a suspension also mutes).';

-- A muted citizen publishes nothing: the column named by the trigger argument holds the author.
create function game.refuse_muted()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if game.sanction_active((to_jsonb(new) ->> tg_argv[0])::uuid, 'mute') then
    raise exception 'muted' using errcode = '42501';
  end if;
  return new;
end;
$$;
comment on function game.refuse_muted() is 'Refuses messages, articles, newspapers, pictures and descriptions of muted citizens.';

create trigger messages_refuse_muted before insert on game.messages
for each row execute function game.refuse_muted('sender_user_id');
create trigger articles_refuse_muted before insert on game.articles
for each row execute function game.refuse_muted('author_user_id');
create trigger newspapers_refuse_muted before insert or update of name on game.newspapers
for each row execute function game.refuse_muted('owner_user_id');
-- Clearing a profile stays possible; only a new picture or description is refused.
create trigger citizens_refuse_muted before update of bio, avatar_path on game.citizens
for each row
when ((new.bio is distinct from old.bio and new.bio <> '')
      or (new.avatar_path is distinct from old.avatar_path and new.avatar_path is not null))
execute function game.refuse_muted('user_id');

-- PostgREST's pre-request hook now also refuses every write of a suspended player.
create or replace function public.check_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null or current_setting('transaction_read_only', true) = 'on' then
    return;
  end if;
  if game.sanction_active(v_user, 'suspension') then
    raise exception 'account_suspended' using errcode = 'PT403';
  end if;
  insert into game.request_counters (user_id, window_start) values (v_user, date_trunc('minute', game.now()))
  on conflict (user_id, window_start) do update set requests = game.request_counters.requests + 1
  returning requests into v_count;
  if v_count > game.param('rate_limit_writes_per_minute') then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
end;
$$;
comment on function public.check_request() is
  'PostgREST pre-request hook: refuses writes of suspended players (403) and the excess per minute (429).';

-- A citizen by name, for moderators.
create function game.citizen_by_name(p_name text)
returns game.citizens
language plpgsql
stable
set search_path = ''
as $$
declare
  v_citizen game.citizens;
begin
  select * into v_citizen from game.citizens
  where (name collate game.citizen_name) = (btrim(coalesce(p_name, '')) collate game.citizen_name);
  if not found then
    raise exception 'citizen_not_found' using errcode = 'P0002';
  end if;
  return v_citizen;
end;
$$;

-- Sets a sanction; moderators up to 30 days, admins also longer or for good. The player is told. Audited.
create function public.admin_sanction(p_name text, p_kind text, p_reason text, p_note text, p_hours integer default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := game.require_staff();
  v_citizen game.citizens := game.citizen_by_name(p_name);
  v_note text := btrim(coalesce(p_note, ''));
  v_ends timestamptz;
  v_id bigint;
begin
  if p_kind is null or p_kind not in ('warning', 'mute', 'suspension')
     or p_reason is null or p_reason not in ('spam', 'abuse', 'hate', 'cheating', 'multi_account', 'name', 'other') then
    raise exception 'sanction_invalid' using errcode = '22023';
  end if;
  if char_length(v_note) not between 3 and 500 then
    raise exception 'note_invalid' using errcode = '22023';
  end if;
  if p_kind <> 'warning' then
    if p_hours is not null and p_hours not between 1 and 87600 then
      raise exception 'duration_invalid' using errcode = '22023';
    end if;
    if (p_hours is null or p_hours > 720) and game.staff_role(v_staff) <> 'admin' then
      raise exception 'admin_only' using errcode = '42501';
    end if;
    v_ends := game.now() + make_interval(hours => p_hours);
  end if;
  insert into game.sanctions (user_id, kind, reason, note, starts_at, ends_at, created_by)
  values (v_citizen.user_id, p_kind, p_reason, v_note, game.now(), v_ends, v_staff)
  returning id into v_id;
  perform game.notify(v_citizen.user_id, null, 'sanction',
                      jsonb_build_object('kind', p_kind, 'reason', p_reason, 'note', v_note, 'ends_at', v_ends));
  perform game.log_admin_action(v_staff, 'sanction', 'citizen:' || v_citizen.name, null,
                                jsonb_build_object('sanction_id', v_id, 'kind', p_kind, 'reason', p_reason,
                                                   'ends_at', v_ends, 'note', v_note));
  return v_id;
end;
$$;
comment on function public.admin_sanction(text, text, text, text, integer) is
  'Moderators: warns, mutes or suspends a citizen for some hours (admins: also for good). Audited.';
grant execute on function public.admin_sanction(text, text, text, text, integer) to authenticated;

create function public.admin_revoke_sanction(p_sanction_id bigint, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := game.require_staff();
  v_row game.sanctions;
  v_note text := btrim(coalesce(p_note, ''));
begin
  select * into v_row from game.sanctions where id = p_sanction_id for update;
  if not found or v_row.revoked_at is not null or v_row.kind = 'warning'
     or (v_row.ends_at is not null and v_row.ends_at <= game.now()) then
    raise exception 'sanction_closed' using errcode = '22023';
  end if;
  if char_length(v_note) not between 3 and 300 then
    raise exception 'note_invalid' using errcode = '22023';
  end if;
  if v_row.ends_at is null and game.staff_role(v_staff) <> 'admin' then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  update game.sanctions set revoked_at = game.now(), revoked_by = v_staff, revoke_note = v_note where id = v_row.id;
  perform game.notify(v_row.user_id, null, 'sanction_lifted', jsonb_build_object('kind', v_row.kind));
  perform game.log_admin_action(v_staff, 'revoke_sanction',
                                'citizen:' || (select name from game.citizens where user_id = v_row.user_id),
                                jsonb_build_object('sanction_id', v_row.id, 'kind', v_row.kind, 'ends_at', v_row.ends_at),
                                jsonb_build_object('sanction_id', v_row.id, 'revoked', true, 'note', v_note));
end;
$$;
comment on function public.admin_revoke_sanction(bigint, text) is
  'Moderators: lifts a mute or suspension in force (one for good, admins only). Audited.';
grant execute on function public.admin_revoke_sanction(bigint, text) to authenticated;

create function public.admin_list_sanctions(p_active_only boolean default true)
returns table (sanction_id bigint, citizen_name text, kind text, reason text, note text, starts_at timestamptz,
               ends_at timestamptz, created_by text, revoked_at timestamptz, revoked_by text, revoke_note text,
               active boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_staff();
  return query
  select s.id, c.name, s.kind, s.reason, s.note, s.starts_at, s.ends_at, cb.email::text, s.revoked_at, rb.email::text,
         s.revoke_note,
         s.kind <> 'warning' and s.revoked_at is null and (s.ends_at is null or s.ends_at > game.now())
  from game.sanctions as s
  join game.citizens as c on c.user_id = s.user_id
  left join auth.users as cb on cb.id = s.created_by
  left join auth.users as rb on rb.id = s.revoked_by
  where not coalesce(p_active_only, true)
     or (s.kind <> 'warning' and s.revoked_at is null and (s.ends_at is null or s.ends_at > game.now()))
  order by s.starts_at desc, s.id desc
  limit 300;
end;
$$;
comment on function public.admin_list_sanctions(boolean) is 'Moderators: sanctions in force (or all of them), latest first.';
grant execute on function public.admin_list_sanctions(boolean) to authenticated;

-- What the player sees: sanctions in force and the warnings of the last 7 days.
create function public.get_my_sanctions()
returns table (kind text, reason text, note text, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.kind, s.reason, s.note, s.starts_at, s.ends_at
  from game.sanctions as s
  where s.user_id = auth.uid() and s.revoked_at is null
    and ((s.kind <> 'warning' and (s.ends_at is null or s.ends_at > game.now()))
         or (s.kind = 'warning' and s.starts_at > game.now() - interval '7 days'))
  order by s.starts_at desc;
$$;
comment on function public.get_my_sanctions() is 'The player''s sanctions in force and warnings of the last 7 days.';
grant execute on function public.get_my_sanctions() to authenticated;

-- Moderating citizens ------------------------------------------------------------------------------------------------

create table game.staff_notes (
  id bigint generated always as identity primary key,
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 3 and 1000),
  author_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null
);
alter table game.staff_notes enable row level security;
comment on table game.staff_notes is 'What the staff wrote down about a citizen. Only the staff reads it; append-only.';
create index staff_notes_user_idx on game.staff_notes (user_id, created_at desc);
create index staff_notes_author_idx on game.staff_notes (author_user_id) where author_user_id is not null;

create function game.keep_staff_notes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'staff_notes is append-only' using errcode = '42501';
end;
$$;

-- Notes go with their citizen (an expired sign-up reservation is deleted); otherwise they never change.
create trigger staff_notes_append_only
before update or truncate on game.staff_notes
for each statement execute function game.keep_staff_notes();

create function public.admin_search_citizens(p_query text)
returns table (name text, email text, country_code text, citizen_code text, level integer, joined_at timestamptz,
               last_sign_in_at timestamptz, sanction text, open_reports integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := btrim(coalesce(p_query, ''));
  v_pattern text;
begin
  perform game.require_staff();
  if char_length(v_query) < 2 then
    raise exception 'query_too_short' using errcode = '22023';
  end if;
  v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return query
  select c.name, u.email::text, c.country_code, game.citizen_code(c.country_code, c.citizen_number),
         game.level_for_experience(coalesce(ps.experience, 0)), c.joined_at, u.last_sign_in_at,
         (select s.kind from game.sanctions as s
          where s.user_id = c.user_id and s.kind <> 'warning' and s.revoked_at is null
            and s.starts_at <= game.now() and (s.ends_at is null or s.ends_at > game.now())
          order by s.kind = 'suspension' desc limit 1),
         (select count(*)::integer from game.reports as r
          where r.status = 'open' and r.target_kind = 'citizen' and r.target_id = c.user_id::text)
  from game.citizens as c
  join auth.users as u on u.id = c.user_id
  left join game.player_stats as ps on ps.user_id = c.user_id
  where c.name ilike v_pattern or u.email::text ilike v_pattern
     or game.citizen_code(c.country_code, c.citizen_number) ilike v_pattern
  order by c.name
  limit 50;
end;
$$;
comment on function public.admin_search_citizens(text) is 'Moderators: citizens whose name, email or citizen code contains the text.';
grant execute on function public.admin_search_citizens(text) to authenticated;

-- A citizen's record for moderators: account, standing, money, what they own, sanctions, reports, notes and signals.
create function public.admin_get_citizen(p_name text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens;
begin
  perform game.require_staff();
  v_citizen := game.citizen_by_name(p_name);
  return (
    select jsonb_build_object(
      'name', v_citizen.name,
      'email', u.email,
      'email_confirmed', u.email_confirmed_at is not null,
      'signed_up_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at,
      'country_code', v_citizen.country_code,
      'region_code', v_citizen.region_code,
      'citizen_code', game.citizen_code(v_citizen.country_code, v_citizen.citizen_number),
      'joined_at', v_citizen.joined_at,
      'level', game.level_for_experience(coalesce(ps.experience, 0)),
      'experience', coalesce(ps.experience, 0),
      'strength', coalesce(ps.strength, 0),
      'health', coalesce(ps.health, 0),
      'bio', v_citizen.bio,
      'avatar_path', v_citizen.avatar_path,
      'referred_by', (select r.name from game.citizens as r where r.user_id = v_citizen.referred_by_user_id),
      'party', (select jsonb_build_object('id', p.id, 'name', p.name)
                from game.party_memberships as m join game.parties as p on p.id = m.party_id
                where m.user_id = v_citizen.user_id),
      'regiment', (select jsonb_build_object('id', g.id, 'name', g.name)
                   from game.regiment_members as m join game.regiments as g on g.id = m.regiment_id
                   where m.user_id = v_citizen.user_id),
      'newspaper', (select jsonb_build_object('id', n.id, 'name', n.name)
                    from game.newspapers as n where n.owner_user_id = v_citizen.user_id),
      'companies', coalesce((
        select jsonb_agg(jsonb_build_object('id', co.id, 'name', co.name, 'level', co.level,
                                            'region_code', co.region_code) order by co.created_at)
        from game.companies as co where co.owner_user_id = v_citizen.user_id), '[]'::jsonb),
      'balances', coalesce((
        select jsonb_agg(jsonb_build_object('currency_code', a.currency_code, 'balance', a.balance)
                         order by a.currency_code <> 'GOLD', a.currency_code)
        from game.accounts as a where a.kind = 'citizen' and a.user_id = v_citizen.user_id), '[]'::jsonb),
      'sanctions', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'sanction_id', s.id, 'kind', s.kind, 'reason', s.reason, 'note', s.note, 'starts_at', s.starts_at,
                 'ends_at', s.ends_at, 'created_by', cb.email, 'revoked_at', s.revoked_at, 'revoke_note', s.revoke_note,
                 'active', s.kind <> 'warning' and s.revoked_at is null and (s.ends_at is null or s.ends_at > game.now()))
               order by s.starts_at desc)
        from game.sanctions as s left join auth.users as cb on cb.id = s.created_by
        where s.user_id = v_citizen.user_id), '[]'::jsonb),
      'reports', coalesce((
        select jsonb_agg(jsonb_build_object('report_id', r.id, 'target_kind', r.target_kind, 'target_id', r.target_id,
                                            'reason', r.reason, 'details', r.details, 'status', r.status,
                                            'created_at', r.created_at) order by r.created_at desc)
        from game.reports as r
        where (r.target_kind = 'citizen' and r.target_id = v_citizen.user_id::text)
           or (r.target_kind = 'article' and r.target_id in (
                 select a.id::text from game.articles as a where a.author_user_id = v_citizen.user_id))
           or (r.target_kind = 'message' and r.target_id in (
                 select m.id::text from game.messages as m where m.sender_user_id = v_citizen.user_id))), '[]'::jsonb),
      'reports_filed', (select count(*) from game.reports as r where r.reporter_user_id = v_citizen.user_id),
      'articles', coalesce((
        select jsonb_agg(x.article order by x.published_at desc)
        from (select jsonb_build_object('id', a.id, 'title', a.title, 'published_at', a.published_at,
                                        'hidden', a.hidden_at is not null) as article, a.published_at
              from game.articles as a where a.author_user_id = v_citizen.user_id
              order by a.published_at desc limit 20) as x), '[]'::jsonb),
      'notes', coalesce((
        select jsonb_agg(jsonb_build_object('id', n.id, 'body', n.body, 'author', au.email, 'created_at', n.created_at)
                         order by n.created_at desc)
        from game.staff_notes as n left join auth.users as au on au.id = n.author_user_id
        where n.user_id = v_citizen.user_id), '[]'::jsonb),
      'signals', coalesce((
        select jsonb_agg(jsonb_build_object('signal_id', sg.id, 'kind', sg.kind,
                                            'other_name', (select o.name from game.citizens as o
                                                           where o.user_id = case when sg.user_id = v_citizen.user_id
                                                                                  then sg.other_user_id else sg.user_id end),
                                            'created_at', sg.created_at, 'reviewed', sg.reviewed_at is not null)
                         order by sg.created_at desc)
        from game.abuse_signals as sg
        where v_citizen.user_id in (sg.user_id, sg.other_user_id)), '[]'::jsonb)
    )
    from auth.users as u
    left join game.player_stats as ps on ps.user_id = v_citizen.user_id
    where u.id = v_citizen.user_id
  );
end;
$$;
comment on function public.admin_get_citizen(text) is
  'Moderators: a citizen''s account, standing, money, belongings, sanctions, reports, articles, notes and signals.';
grant execute on function public.admin_get_citizen(text) to authenticated;

create function public.admin_add_note(p_name text, p_body text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := game.require_staff();
  v_citizen game.citizens := game.citizen_by_name(p_name);
  v_body text := btrim(coalesce(p_body, ''));
  v_id bigint;
begin
  if char_length(v_body) not between 3 and 1000 then
    raise exception 'note_invalid' using errcode = '22023';
  end if;
  insert into game.staff_notes (user_id, body, author_user_id, created_at)
  values (v_citizen.user_id, v_body, v_staff, game.now())
  returning id into v_id;
  perform game.log_admin_action(v_staff, 'staff_note', 'citizen:' || v_citizen.name, null,
                                jsonb_build_object('note_id', v_id));
  return v_id;
end;
$$;
comment on function public.admin_add_note(text, text) is 'Moderators: writes down a note about a citizen for the staff.';
grant execute on function public.admin_add_note(text, text) to authenticated;

-- Hides an article or a message without waiting for a report; closes the open reports on it. Audited.
create function public.admin_hide_content(p_kind text, p_target text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := game.require_staff();
  v_note text := btrim(coalesce(p_note, ''));
begin
  if char_length(v_note) not between 3 and 300 then
    raise exception 'note_invalid' using errcode = '22023';
  end if;
  perform game.set_hidden(p_kind, p_target, v_staff, true);
  update game.reports
  set status = 'actioned', reviewed_by = v_staff, reviewed_at = game.now(), resolution = v_note
  where target_kind = p_kind and target_id = p_target and status = 'open';
  perform game.log_admin_action(v_staff, 'hide_content', p_kind || ':' || p_target,
                                jsonb_build_object('hidden', false), jsonb_build_object('hidden', true, 'note', v_note));
end;
$$;
comment on function public.admin_hide_content(text, text, text) is
  'Moderators: hides an article or a message and closes its open reports. Audited.';
grant execute on function public.admin_hide_content(text, text, text) to authenticated;

create function public.admin_clear_profile(p_name text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := game.require_staff();
  v_citizen game.citizens := game.citizen_by_name(p_name);
  v_note text := btrim(coalesce(p_note, ''));
begin
  if char_length(v_note) not between 3 and 300 then
    raise exception 'note_invalid' using errcode = '22023';
  end if;
  if v_citizen.avatar_path is null and v_citizen.bio = '' then
    raise exception 'no_change' using errcode = '22023';
  end if;
  update game.citizens set avatar_path = null, bio = '' where user_id = v_citizen.user_id;
  perform game.log_admin_action(v_staff, 'clear_profile', 'citizen:' || v_citizen.name,
                                jsonb_build_object('avatar_path', v_citizen.avatar_path, 'bio', v_citizen.bio),
                                jsonb_build_object('avatar_path', null, 'bio', '', 'note', v_note));
end;
$$;
comment on function public.admin_clear_profile(text, text) is
  'Moderators: removes a citizen''s picture and description. Audited.';
grant execute on function public.admin_clear_profile(text, text) to authenticated;

-- The name stays immutable for players; moderation may replace an offensive one (ADR 0049).
create or replace function game.keep_citizen_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.name is distinct from old.name
    and coalesce(current_setting('game.moderation_rename', true), '') <> 'on'
    and exists (select 1 from auth.users where id = old.user_id and email_confirmed_at is not null) then
    raise exception 'citizen_name_immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function public.admin_rename_citizen(p_name text, p_new_name text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := game.require_staff();
  v_citizen game.citizens := game.citizen_by_name(p_name);
  v_new text := btrim(coalesce(p_new_name, ''));
  v_note text := btrim(coalesce(p_note, ''));
begin
  if not game.is_valid_citizen_name(v_new) then
    raise exception 'citizen_name_invalid' using errcode = '22023';
  end if;
  if char_length(v_note) not between 3 and 300 then
    raise exception 'note_invalid' using errcode = '22023';
  end if;
  if v_new = v_citizen.name then
    raise exception 'no_change' using errcode = '22023';
  end if;
  perform set_config('game.moderation_rename', 'on', true);
  begin
    update game.citizens set name = v_new where user_id = v_citizen.user_id;
  exception when unique_violation then
    raise exception 'citizen_name_taken' using errcode = '23505';
  end;
  perform set_config('game.moderation_rename', '', true);
  perform game.notify(v_citizen.user_id, null, 'renamed',
                      jsonb_build_object('before', v_citizen.name, 'after', v_new, 'note', v_note));
  perform game.log_admin_action(v_staff, 'rename_citizen', 'citizen:' || v_new,
                                jsonb_build_object('name', v_citizen.name),
                                jsonb_build_object('name', v_new, 'note', v_note));
end;
$$;
comment on function public.admin_rename_citizen(text, text, text) is
  'Moderators: replaces an offensive citizen name; the player is told. Audited.';
grant execute on function public.admin_rename_citizen(text, text, text) to authenticated;

-- Replaces an offensive name of a company, party, regiment or newspaper. Audited.
create function public.admin_rename(p_kind text, p_id bigint, p_new_name text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := game.require_staff();
  v_new text := btrim(coalesce(p_new_name, ''));
  v_note text := btrim(coalesce(p_note, ''));
  v_before text;
begin
  if p_kind is null or p_kind not in ('company', 'party', 'regiment', 'newspaper') then
    raise exception 'target_invalid' using errcode = '22023';
  end if;
  if char_length(v_new) not between 3 and (case when p_kind = 'newspaper' then 60 else 40 end) then
    raise exception 'name_invalid' using errcode = '22023';
  end if;
  if char_length(v_note) not between 3 and 300 then
    raise exception 'note_invalid' using errcode = '22023';
  end if;
  begin
    case p_kind
      when 'company' then
        select name into v_before from game.companies where id = p_id for update;
        update game.companies set name = v_new where id = p_id;
      when 'party' then
        select name into v_before from game.parties where id = p_id for update;
        update game.parties set name = v_new where id = p_id;
      when 'regiment' then
        select name into v_before from game.regiments where id = p_id for update;
        update game.regiments set name = v_new where id = p_id;
      else
        select name into v_before from game.newspapers where id = p_id for update;
        update game.newspapers set name = v_new where id = p_id;
    end case;
  exception when unique_violation then
    raise exception 'name_taken' using errcode = '23505';
  end;
  if v_before is null then
    raise exception 'target_invalid' using errcode = '22023';
  end if;
  perform game.log_admin_action(v_staff, 'rename_' || p_kind, p_kind || ':' || p_id::text,
                                jsonb_build_object('name', v_before), jsonb_build_object('name', v_new, 'note', v_note));
end;
$$;
comment on function public.admin_rename(text, bigint, text, text) is
  'Moderators: replaces the name of a company, party, regiment or newspaper. Audited.';
grant execute on function public.admin_rename(text, bigint, text, text) to authenticated;

-- Reports are for moderators too --------------------------------------------------------------------------------------

create or replace function public.admin_resolve_report(p_report_id bigint, p_action text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_staff();
  v_report game.reports;
  v_status text;
  v_before jsonb := '{}';
  v_after jsonb := '{}';
  v_citizen game.citizens;
begin
  select * into v_report from game.reports where id = p_report_id for update;
  if not found or v_report.status <> 'open' then
    raise exception 'report_closed' using errcode = '22023';
  end if;
  if p_action = 'hide' then
    perform game.set_hidden(v_report.target_kind, v_report.target_id, v_admin, true);
    v_status := 'actioned';
  elsif p_action = 'clear_profile' and v_report.target_kind = 'citizen' then
    select * into v_citizen from game.citizens where user_id::text = v_report.target_id for update;
    if not found then
      raise exception 'target_invalid' using errcode = '22023';
    end if;
    update game.citizens set avatar_path = null, bio = '' where user_id = v_citizen.user_id;
    v_before := jsonb_build_object('avatar_path', v_citizen.avatar_path, 'bio', v_citizen.bio);
    v_after := jsonb_build_object('avatar_path', null, 'bio', '');
    v_status := 'actioned';
  elsif p_action = 'dismiss' then
    v_status := 'dismissed';
  else
    raise exception 'action_invalid' using errcode = '22023';
  end if;
  update game.reports
  set status = v_status, reviewed_by = v_admin, reviewed_at = game.now(), resolution = left(btrim(coalesce(p_note, '')), 300)
  where target_kind = v_report.target_kind and target_id = v_report.target_id and status = 'open';
  perform game.log_admin_action(
    v_admin, 'resolve_report', v_report.target_kind || ':' || v_report.target_id,
    v_before || jsonb_build_object('report_id', v_report.id, 'status', 'open'),
    v_after || jsonb_build_object('report_id', v_report.id, 'status', v_status, 'action', p_action,
                                  'note', btrim(coalesce(p_note, '')))
  );
end;
$$;

-- The reported citizen's name comes along, so the console can open their record.
-- squawk-ignore ban-drop-function
drop function public.admin_list_reports(text);
create function public.admin_list_reports(p_status text default 'open')
returns table (report_id bigint, target_kind text, target_id text, reason text, details text, status text,
               created_at timestamptz, reporter_name text, target_author text, target_title text, target_excerpt text,
               target_hidden boolean, reports_on_target integer, resolution text, target_picture text,
               reviewed_at timestamptz, reviewed_by text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_staff();
  return query
  select r.id, r.target_kind, r.target_id, r.reason, r.details, r.status, r.created_at, rc.name,
         coalesce(aa.name, ms.name, tc.name), a.title, left(coalesce(a.body, m.body, nullif(tc.bio, '')), 280),
         coalesce(a.hidden_at, m.hidden_at) is not null,
         (select count(*)::integer from game.reports as o
          where o.target_kind = r.target_kind and o.target_id = r.target_id),
         r.resolution, tc.avatar_path, r.reviewed_at, rb.email::text
  from game.reports as r
  left join game.citizens as rc on rc.user_id = r.reporter_user_id
  left join game.articles as a on r.target_kind = 'article' and a.id::text = r.target_id
  left join game.citizens as aa on aa.user_id = a.author_user_id
  left join game.messages as m on r.target_kind = 'message' and m.id::text = r.target_id
  left join game.citizens as ms on ms.user_id = m.sender_user_id
  left join game.citizens as tc on r.target_kind = 'citizen' and tc.user_id::text = r.target_id
  left join auth.users as rb on rb.id = r.reviewed_by
  where r.status = coalesce(p_status, r.status)
  order by case when r.status = 'open' then r.created_at end, r.reviewed_at desc nulls last
  limit 200;
end;
$$;
comment on function public.admin_list_reports(text) is
  'Moderators: reports (open ones oldest first, closed ones latest first) with what was reported.';
grant execute on function public.admin_list_reports(text) to authenticated;

create or replace function public.admin_unhide(p_kind text, p_target text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_staff();
begin
  perform game.set_hidden(p_kind, p_target, v_admin, false);
  perform game.log_admin_action(v_admin, 'unhide_content', p_kind || ':' || p_target,
                                jsonb_build_object('hidden', true), jsonb_build_object('hidden', false));
end;
$$;
comment on function public.admin_unhide(text, text) is 'Moderators: shows a hidden article or message again. Audited.';

-- The console's overview ---------------------------------------------------------------------------------------------

create function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_day_start timestamptz := game.game_day_start(game.game_day());
begin
  perform game.require_staff();
  return jsonb_build_object(
    'game_day', game.game_day(),
    'citizens', (select count(*) from game.citizens where joined_at is not null),
    'new_today', (select count(*) from game.citizens where joined_at >= v_day_start),
    'active_24h', (select count(*) from game.citizens as c join auth.users as u on u.id = c.user_id
                   where u.last_sign_in_at > game.now() - interval '24 hours'),
    'waiting', (select count(*) from game.waitlist),
    'countries_in_play', (select count(*) from game.countries where is_active),
    'suspended', (select count(distinct s.user_id) from game.sanctions as s
                  where s.kind = 'suspension' and s.revoked_at is null and s.starts_at <= game.now()
                    and (s.ends_at is null or s.ends_at > game.now())),
    'muted', (select count(distinct s.user_id) from game.sanctions as s
              where s.kind = 'mute' and s.revoked_at is null and s.starts_at <= game.now()
                and (s.ends_at is null or s.ends_at > game.now())),
    'open_reports', (select count(*) from game.reports where status = 'open'),
    'open_signals', (select count(*) from game.abuse_signals where reviewed_at is null),
    -- GOLD: created by the issuer, burned into the sink, and what everyone else holds.
    'gold_minted', (select -balance from game.accounts where kind = 'issuer' and currency_code = 'GOLD'),
    'gold_burned', (select balance from game.accounts where kind = 'sink' and currency_code = 'GOLD'),
    'gold_held', (select coalesce(sum(balance), 0) from game.accounts
                  where currency_code = 'GOLD' and kind not in ('issuer', 'sink')),
    'gold_burned_today', (select coalesce(sum(p.amount), 0) from game.ledger_postings as p
                          where p.currency_code = 'GOLD' and p.created_at >= v_day_start
                            and p.credit_account_id = (select id from game.accounts
                                                       where kind = 'sink' and currency_code = 'GOLD')),
    'gold_minted_today', (select coalesce(sum(p.amount), 0) from game.ledger_postings as p
                          where p.currency_code = 'GOLD' and p.created_at >= v_day_start
                            and p.debit_account_id = (select id from game.accounts
                                                      where kind = 'issuer' and currency_code = 'GOLD'))
  );
end;
$$;
comment on function public.admin_overview() is 'Staff: today''s figures of players, moderation and GOLD.';
grant execute on function public.admin_overview() to authenticated;
