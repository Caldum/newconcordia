-- W5 · Diplomacy, travel and presence: alliances by laws of both nations, broken relations, economic and arms
-- embargoes, peace, allies fighting remotely and treated by «allies» hospitals; travel between regions shipped as
-- configuration, off until its price is decided (spec sections 6, 9 and 13, ADR 0035).
--
-- game.alliance_approvals   each nation's law approving an alliance with another; two reciprocal approvals form it
-- game.alliances            active alliances (country_a < country_b) until a law ends them
-- game.broken_relations     relations a country broke with another: ends their alliance, blocks a new one
-- game.embargoes            economic (every good) or arms (military goods) embargoes of a country against another
-- Bill kinds alliance, break_relations, peace {country_code}; embargo, lift_embargo {country_code, kind}.
-- Peace ends the designation of that country as enemy, cancels pending war authorizations against it (refunded)
-- and restores the relations this country had broken with it.
-- Embargoes block direct trade: offers and trades in a market whose country embargoes the participant's country or
-- the goods' origin (arms: military goods only), and trades by citizens of an embargoing country in the embargoed
-- market. Enforced by triggers on offers and trades.
-- game.allied and game.care_allowed now read alliances. public.travel moves a citizen to another region: off
-- (travel_enabled = 0) until PD-03 sets its price; at zero health nobody travels.
--
-- public.travel, get_travel_terms, list_foreign_relations
--
-- Errors (ADR 0005): country_invalid, bill_terms_invalid, relations_broken, embargoed, travel_disabled, region_invalid,
-- health_zero, insufficient_funds.
--
-- Rollback: drop the triggers market_offers_embargo and market_trades_embargo with their functions, public.travel,
-- public.get_travel_terms, public.list_foreign_relations, game.trade_blocked, game.embargoes, game.broken_relations,
-- game.alliances, game.alliance_approvals; restore game.foreign_bill_terms and game.execute_foreign_bill from
-- 20261024090000, game.allied from 20261025090000 and game.care_allowed from 20261024090000; delete the
-- balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('travel_enabled', 0, 'Travel between regions: off until PD-03 decides its price and time.'),
  ('travel_price_gold', 0, 'GOLD hundredths a trip costs. PENDING (PD-03): not a decided value.');

-- Treaties ---------------------------------------------------------------------------------------------------------

create table game.alliance_approvals (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  partner_country_code text not null references game.countries (code),
  bill_id bigint not null references game.bills (id),
  approved_at timestamptz not null,
  used_at timestamptz,
  constraint alliance_approvals_not_self check (country_code <> partner_country_code)
);
alter table game.alliance_approvals enable row level security;
comment on table game.alliance_approvals is 'A nation''s law approving an alliance; the partner''s reciprocal law forms it.';
create unique index alliance_approvals_one_open on game.alliance_approvals (country_code, partner_country_code) where used_at is null;
create index alliance_approvals_partner_idx on game.alliance_approvals (partner_country_code);
create index alliance_approvals_bill_idx on game.alliance_approvals (bill_id);

create table game.alliances (
  id bigint generated always as identity primary key,
  country_a text not null references game.countries (code),
  country_b text not null references game.countries (code),
  since timestamptz not null,
  ended_at timestamptz,
  constraint alliances_ordered check (country_a < country_b)
);
alter table game.alliances enable row level security;
comment on table game.alliances is 'Alliances between two nations, created by laws of both and ended by law.';
create unique index alliances_one_active on game.alliances (country_a, country_b) where ended_at is null;
create index alliances_b_idx on game.alliances (country_b);

create table game.broken_relations (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  other_country_code text not null references game.countries (code),
  since timestamptz not null,
  restored_at timestamptz
);
alter table game.broken_relations enable row level security;
comment on table game.broken_relations is 'Relations a country broke with another (ambassadors expelled) until its peace law.';
create unique index broken_relations_one_active on game.broken_relations (country_code, other_country_code) where restored_at is null;
create index broken_relations_other_idx on game.broken_relations (other_country_code);

create table game.embargoes (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  target_country_code text not null references game.countries (code),
  kind text not null check (kind in ('economic', 'arms')),
  since timestamptz not null,
  lifted_at timestamptz
);
alter table game.embargoes enable row level security;
comment on table game.embargoes is 'Economic (every good) and arms (military goods) embargoes, by law.';
create unique index embargoes_one_active on game.embargoes (country_code, target_country_code, kind) where lifted_at is null;
create index embargoes_target_idx on game.embargoes (target_country_code);

create or replace function game.allied(p_a text, p_b text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from game.alliances
                 where country_a = least(p_a, p_b) and country_b = greatest(p_a, p_b) and ended_at is null);
$$;

create or replace function game.care_allowed(p_country text, p_patient_country text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case coalesce((select policy from game.care_policies where country_code = p_country), 'universal')
    when 'universal' then true
    when 'non_enemies' then p_patient_country is distinct from game.enemy_of(p_country)
    when 'allies' then p_patient_country = p_country or game.allied(p_country, p_patient_country)
    else p_patient_country = p_country
  end;
$$;

create function game.relations_broken(p_a text, p_b text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from game.broken_relations
                 where restored_at is null
                   and ((country_code = p_a and other_country_code = p_b) or (country_code = p_b and other_country_code = p_a)));
$$;

-- Bills ------------------------------------------------------------------------------------------------------------

create or replace function game.foreign_bill_terms(p_country_code text, p_kind text, p_terms jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_target text := p_terms ->> 'country_code';
begin
  if p_kind not in ('war_authorization', 'enemy_designation', 'alliance', 'break_relations', 'embargo', 'lift_embargo',
                    'peace') then
    raise exception 'bill_kind_invalid' using errcode = '22023';
  end if;
  if p_kind = 'enemy_designation' and v_target is null then
    return '{}'::jsonb;
  end if;
  if v_target is null or jsonb_typeof(p_terms -> 'country_code') <> 'string' then
    raise exception 'bill_terms_invalid' using errcode = '22023';
  end if;
  if v_target = p_country_code or not exists (select 1 from game.countries where code = v_target) then
    raise exception 'country_invalid' using errcode = '22023';
  end if;
  if p_kind in ('war_authorization', 'enemy_designation', 'alliance')
     and not (select is_active from game.countries where code = v_target) then
    raise exception 'country_inactive' using errcode = '22023';
  end if;
  if p_kind = 'alliance' and game.relations_broken(p_country_code, v_target) then
    raise exception 'relations_broken' using errcode = '22023';
  end if;
  if p_kind in ('embargo', 'lift_embargo') then
    if coalesce(p_terms ->> 'kind', '') not in ('economic', 'arms') then
      raise exception 'bill_terms_invalid' using errcode = '22023';
    end if;
    return jsonb_build_object('country_code', v_target, 'kind', p_terms ->> 'kind');
  end if;
  return jsonb_build_object('country_code', v_target);
end;
$$;

create or replace function game.execute_foreign_bill(p_bill game.bills)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_target text := p_bill.terms ->> 'country_code';
  v_authorization game.war_authorizations;
begin
  case p_bill.kind
    when 'war_authorization' then
      -- The hold stays open: it is burned when the president launches and refunded on expiry or cancellation.
      insert into game.war_authorizations (country_code, target_country_code, bill_id, hold_id, approved_at, expires_at)
      select p_bill.country_code, v_target, p_bill.id, r.hold_id, game.now(),
             game.now() + make_interval(hours => game.param('war_launch_hours')::integer)
      from game.bill_reservations as r
      where r.bill_id = p_bill.id;
    when 'enemy_designation' then
      update game.enemy_designations set ended_at = game.now()
      where country_code = p_bill.country_code and ended_at is null;
      if v_target is not null then
        insert into game.enemy_designations (country_code, enemy_country_code, bill_id, since)
        values (p_bill.country_code, v_target, p_bill.id, game.now());
      end if;
    when 'alliance' then
      if game.relations_broken(p_bill.country_code, v_target) then
        raise exception 'relations_broken' using errcode = '22023';
      end if;
      if game.allied(p_bill.country_code, v_target) then
        return;
      end if;
      insert into game.alliance_approvals (country_code, partner_country_code, bill_id, approved_at)
      values (p_bill.country_code, v_target, p_bill.id, game.now())
      on conflict (country_code, partner_country_code) where used_at is null do nothing;
      if exists (select 1 from game.alliance_approvals
                 where country_code = v_target and partner_country_code = p_bill.country_code and used_at is null) then
        update game.alliance_approvals set used_at = game.now()
        where used_at is null
          and ((country_code = v_target and partner_country_code = p_bill.country_code)
            or (country_code = p_bill.country_code and partner_country_code = v_target));
        insert into game.alliances (country_a, country_b, since)
        values (least(p_bill.country_code, v_target), greatest(p_bill.country_code, v_target), game.now());
      end if;
    when 'break_relations' then
      insert into game.broken_relations (country_code, other_country_code, since)
      values (p_bill.country_code, v_target, game.now())
      on conflict (country_code, other_country_code) where restored_at is null do nothing;
      update game.alliances set ended_at = game.now()
      where country_a = least(p_bill.country_code, v_target) and country_b = greatest(p_bill.country_code, v_target)
        and ended_at is null;
      update game.alliance_approvals set used_at = game.now()
      where used_at is null
        and ((country_code = v_target and partner_country_code = p_bill.country_code)
          or (country_code = p_bill.country_code and partner_country_code = v_target));
    when 'embargo' then
      insert into game.embargoes (country_code, target_country_code, kind, since)
      values (p_bill.country_code, v_target, p_bill.terms ->> 'kind', game.now())
      on conflict (country_code, target_country_code, kind) where lifted_at is null do nothing;
    when 'lift_embargo' then
      update game.embargoes set lifted_at = game.now()
      where country_code = p_bill.country_code and target_country_code = v_target and kind = p_bill.terms ->> 'kind'
        and lifted_at is null;
    when 'peace' then
      update game.enemy_designations set ended_at = game.now()
      where country_code = p_bill.country_code and enemy_country_code = v_target and ended_at is null;
      for v_authorization in
        select * from game.war_authorizations
        where country_code = p_bill.country_code and target_country_code = v_target and status = 'pending'
        for update
      loop
        perform game.release_hold(v_authorization.hold_id, 'war_refund:' || v_authorization.id::text);
        update game.war_authorizations set status = 'cancelled', closed_at = game.now() where id = v_authorization.id;
      end loop;
      update game.broken_relations set restored_at = game.now()
      where country_code = p_bill.country_code and other_country_code = v_target and restored_at is null;
    else
      raise exception 'bill_kind_invalid' using errcode = '22023';
  end case;
end;
$$;

-- Embargoes on the market ----------------------------------------------------------------------------------------------

-- Whether a trade of a good from p_origin in p_market's market, by a citizen of p_participant, is blocked: the market's
-- country embargoes the participant's country or the origin, or the participant's country embargoes the market's.
-- An arms embargo covers military goods only.
create function game.trade_blocked(p_market text, p_participant text, p_origin text, p_good text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from game.embargoes as e
    where e.lifted_at is null
      and (e.kind = 'economic' or (select category from game.goods where code = p_good) = 'military')
      and ((e.country_code = p_market and e.target_country_code in (p_participant, p_origin))
        or (e.country_code = p_participant and e.target_country_code = p_market))
  );
$$;

create function game.market_offers_embargo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if game.trade_blocked(new.market_country_code, (select country_code from game.citizens where user_id = new.seller_user_id),
                        new.origin_country_code, new.good_code) then
    raise exception 'embargoed' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger market_offers_embargo
before insert on game.market_offers
for each row execute function game.market_offers_embargo();

create function game.market_trades_embargo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_offer game.market_offers;
begin
  select * into v_offer from game.market_offers where id = new.offer_id;
  if game.trade_blocked(v_offer.market_country_code,
                        (select country_code from game.citizens where user_id = new.buyer_user_id),
                        v_offer.origin_country_code, v_offer.good_code)
     or game.trade_blocked(v_offer.market_country_code,
                           (select country_code from game.citizens where user_id = v_offer.seller_user_id),
                           v_offer.origin_country_code, v_offer.good_code) then
    raise exception 'embargoed' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger market_trades_embargo
before insert on game.market_trades
for each row execute function game.market_trades_embargo();

-- Travel ----------------------------------------------------------------------------------------------------------------

create function public.travel(p_region_code text, p_key uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_price bigint := game.param('travel_price_gold')::bigint;
begin
  if game.param('travel_enabled') = 0 then
    raise exception 'travel_disabled' using errcode = '22023';
  end if;
  if not exists (select 1 from game.regions where code = p_region_code and is_enabled)
     or p_region_code = v_citizen.region_code then
    raise exception 'region_invalid' using errcode = '22023';
  end if;
  if (select health from game.player_stats where user_id = v_citizen.user_id for update) <= 0 then
    raise exception 'health_zero' using errcode = '22023';
  end if;
  if v_price > 0 then
    perform game.post(
      'travel', 'travel:' || v_citizen.user_id::text || ':' || coalesce(p_key::text, gen_random_uuid()::text), v_citizen.user_id,
      array[row(game.citizen_account(v_citizen.user_id, 'GOLD'), game.system_account('sink', 'GOLD'), v_price, 'travel',
                p_region_code)::game.ledger_leg]
    );
  end if;
  update game.citizens set region_code = p_region_code where user_id = v_citizen.user_id;
  return p_region_code;
end;
$$;
comment on function public.travel(text, uuid) is
  'Moves the player to another region (presence for battles and hospitals). Off until its price is decided (PD-03).';
grant execute on function public.travel(text, uuid) to authenticated;

create function public.get_travel_terms()
returns table (enabled boolean, price bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select game.param('travel_enabled') <> 0, game.param('travel_price_gold')::bigint;
$$;
comment on function public.get_travel_terms() is 'Whether travel is open and what it costs.';
grant execute on function public.get_travel_terms() to anon, authenticated;

-- Reads -------------------------------------------------------------------------------------------------------------------

-- A country's foreign relations: alliances, its pending alliance approvals, broken relations both ways, embargoes both
-- ways and its enemy. `ours` says whether p_country_code made it.
create function public.list_foreign_relations(p_country_code text)
returns table (relation text, other_country_code text, ours boolean, detail text, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select 'alliance', case when a.country_a = p_country_code then a.country_b else a.country_a end, true, null::text, a.since
  from game.alliances as a
  where a.ended_at is null and p_country_code in (a.country_a, a.country_b)
  union all
  select 'alliance_pending', ap.partner_country_code, true, null, ap.approved_at
  from game.alliance_approvals as ap where ap.country_code = p_country_code and ap.used_at is null
  union all
  select 'alliance_pending', ap.country_code, false, null, ap.approved_at
  from game.alliance_approvals as ap where ap.partner_country_code = p_country_code and ap.used_at is null
  union all
  select 'broken_relations', b.other_country_code, true, null, b.since
  from game.broken_relations as b where b.country_code = p_country_code and b.restored_at is null
  union all
  select 'broken_relations', b.country_code, false, null, b.since
  from game.broken_relations as b where b.other_country_code = p_country_code and b.restored_at is null
  union all
  select 'embargo', e.target_country_code, true, e.kind, e.since
  from game.embargoes as e where e.country_code = p_country_code and e.lifted_at is null
  union all
  select 'embargo', e.country_code, false, e.kind, e.since
  from game.embargoes as e where e.target_country_code = p_country_code and e.lifted_at is null
  union all
  select 'enemy', d.enemy_country_code, true, null, d.since
  from game.enemy_designations as d where d.country_code = p_country_code and d.ended_at is null
  union all
  select 'enemy', d.country_code, false, null, d.since
  from game.enemy_designations as d where d.enemy_country_code = p_country_code and d.ended_at is null
  order by 1, 2;
$$;
comment on function public.list_foreign_relations(text) is 'A country''s alliances, broken relations, embargoes and enemies.';
grant execute on function public.list_foreign_relations(text) to anon, authenticated;
