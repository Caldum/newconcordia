-- W1 · War authorization laws with a 50 GOLD escrow, launched only by the president within 24 hours or refunded,
-- and the designation of an enemy country by law (spec sections 6 and 12.5, ADR 0032).
--
-- game.war_authorizations   an approved authorization against a country: PROPOSED is the bill, then
--                           pending (APPROVED_PENDING_ATTACK) → started | expired | cancelled; the bill's hold
--                           stays locked until the president launches (burned) or it expires or is cancelled (refunded)
-- game.enemy_designations   at most one active enemy per country, set and ended by law; offensives against the enemy
--                           need no authorization and earn +50 % XP (W3)
-- Bill kinds war_authorization {country_code} (locks war_authorization_gold) and enemy_designation {country_code}
-- or {} to end it. The kinds of diplomacy (W5) are admitted by the check and refused until then.
-- game.bill_terms, game.execute_bill now delegate the kinds of foreign policy to game.foreign_bill_terms and
-- game.execute_foreign_bill; the hourly job calls game.hourly_world (expiry here; battles from W2).
-- game.care_allowed: non_enemies now refuses citizens of the designated enemy.
--
-- public.cancel_war_authorization, list_war_authorizations, get_enemy
--
-- Errors (ADR 0005): country_invalid, country_inactive, bill_terms_invalid, not_president, authorization_not_found,
-- authorization_closed, no_authorization.
--
-- Rollback: drop the public functions created here, game.consume_war_authorization,
-- game.expire_war_authorizations, game.hourly_world, game.foreign_bill_terms, game.execute_foreign_bill,
-- game.enemy_of, game.enemy_designations and game.war_authorizations (after releasing open holds); restore
-- game.bill_terms, game.bill_spending, game.execute_bill from 20261021090000, game.job_elections from
-- 20261019090000, game.care_allowed from 20261023090000 and the bills kind check; delete the balance_params rows
-- added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('war_authorization_gold', 5000, 'GOLD hundredths a war authorization locks from the Treasury (burned on launch).'),
  ('war_launch_hours', 24, 'Hours the president has to launch an authorized offensive.');

-- Bills of foreign policy ---------------------------------------------------------------------------------------------

-- Replaced right below, in the same transaction, by the kinds of foreign policy.
-- squawk-ignore ban-drop-constraint
alter table game.bills drop constraint bills_kind_check;
-- squawk-ignore constraint-missing-not-valid
alter table game.bills add constraint bills_kind_check check (kind in (
  'ordinary', 'taxes', 'gold_transfer', 'ministry_allocation', 'currency_issuance', 'central_bank_allocation',
  'war_authorization', 'enemy_designation', 'alliance', 'break_relations', 'embargo', 'lift_embargo', 'peace'
));

-- Terms of the foreign-policy kinds; W5 adds diplomacy.
create function game.foreign_bill_terms(p_country_code text, p_kind text, p_terms jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_target text := p_terms ->> 'country_code';
begin
  if p_kind not in ('war_authorization', 'enemy_designation') then
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
  if not (select is_active from game.countries where code = v_target) then
    raise exception 'country_inactive' using errcode = '22023';
  end if;
  return jsonb_build_object('country_code', v_target);
end;
$$;

create or replace function game.bill_terms(p_country_code text, p_kind text, p_terms jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_terms jsonb := coalesce(p_terms, '{}'::jsonb);
  v_key text;
  v_value numeric;
  v_gold numeric;
  v_credit numeric;
  v_out jsonb := '{}'::jsonb;
  v_ranges constant jsonb := '{"vat": 0.25, "tariff": 0.50, "work_tax": 0.30, "export_tax": 1}'::jsonb;
begin
  if jsonb_typeof(v_terms) <> 'object' then
    raise exception 'bill_terms_invalid' using errcode = '22023';
  end if;
  case p_kind
    when 'ordinary' then
      return '{}'::jsonb;
    when 'taxes' then
      for v_key in select jsonb_object_keys(v_terms) loop
        if jsonb_typeof(v_terms -> v_key) <> 'number' then
          raise exception 'bill_terms_invalid' using errcode = '22023';
        end if;
        v_value := (v_terms ->> v_key)::numeric;
        if v_key = 'minimum_wage' then
          if v_value < 0 or v_value <> trunc(v_value) then
            raise exception 'bill_terms_invalid' using errcode = '22023';
          end if;
        elsif not v_ranges ? v_key or v_value < 0 or v_value > (v_ranges ->> v_key)::numeric
              or v_value <> round(v_value, 4) then
          raise exception 'bill_terms_invalid' using errcode = '22023';
        end if;
        v_out := v_out || jsonb_build_object(v_key, v_value);
      end loop;
      if v_out = '{}'::jsonb then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      return v_out;
    when 'gold_transfer' then
      if jsonb_typeof(v_terms -> 'amount') <> 'number' or jsonb_typeof(v_terms -> 'country_code') <> 'string' then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      v_value := (v_terms ->> 'amount')::numeric;
      if v_value <= 0 or v_value <> trunc(v_value) or v_value > 9e15 then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      if v_terms ->> 'country_code' = p_country_code
         or not exists (select 1 from game.countries where code = v_terms ->> 'country_code') then
        raise exception 'country_invalid' using errcode = '22023';
      end if;
      return jsonb_build_object('country_code', v_terms ->> 'country_code', 'amount', v_value::bigint);
    when 'ministry_allocation', 'central_bank_allocation' then
      if (p_kind = 'ministry_allocation'
          and coalesce(v_terms ->> 'ministry', '') not in ('economy', 'defense', 'foreign_affairs', 'health', 'development'))
         or coalesce(jsonb_typeof(v_terms -> 'gold'), 'number') <> 'number'
         or coalesce(jsonb_typeof(v_terms -> 'credit'), 'number') <> 'number' then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      v_gold := coalesce((v_terms ->> 'gold')::numeric, 0);
      v_credit := coalesce((v_terms ->> 'credit')::numeric, 0);
      if v_gold < 0 or v_credit < 0 or v_gold + v_credit = 0 or v_gold <> trunc(v_gold) or v_credit <> trunc(v_credit)
         or v_gold > 9e15 or v_credit > 9e15 then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      v_out := jsonb_build_object('gold', v_gold::bigint, 'credit', v_credit::bigint);
      if p_kind = 'ministry_allocation' then
        v_out := v_out || jsonb_build_object('ministry', v_terms ->> 'ministry');
      end if;
      return v_out;
    when 'currency_issuance' then
      if jsonb_typeof(v_terms -> 'amount') <> 'number' then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      v_value := (v_terms ->> 'amount')::numeric;
      if v_value <= 0 or v_value <> trunc(v_value) or v_value > 9e15 then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      return jsonb_build_object('amount', v_value::bigint);
    else
      return game.foreign_bill_terms(p_country_code, p_kind, v_terms);
  end case;
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
                  when p_kind = 'war_authorization' then game.param('war_authorization_gold')::bigint end),
    (p_country_code, case when p_kind in ('ministry_allocation', 'central_bank_allocation')
                          then (p_terms ->> 'credit')::bigint end)
  ) as s (currency_code, amount)
  where s.amount > 0;
$$;

-- War authorizations and enemies ----------------------------------------------------------------------------------

create table game.war_authorizations (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  target_country_code text not null references game.countries (code),
  bill_id bigint not null unique references game.bills (id),
  hold_id bigint not null unique references game.ledger_holds (id),
  status text not null default 'pending' check (status in ('pending', 'started', 'expired', 'cancelled')),
  approved_at timestamptz not null,
  expires_at timestamptz not null,
  closed_at timestamptz,
  constraint war_authorizations_closed check ((status = 'pending') = (closed_at is null))
);
alter table game.war_authorizations enable row level security;
comment on table game.war_authorizations is
  'Approved war authorizations: 50 GOLD locked until the president launches (burned) or it expires (refunded).';
create index war_authorizations_pending_idx on game.war_authorizations (expires_at) where status = 'pending';
create index war_authorizations_country_idx on game.war_authorizations (country_code, target_country_code, status);
create index war_authorizations_target_idx on game.war_authorizations (target_country_code);

create table game.enemy_designations (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  enemy_country_code text not null references game.countries (code),
  bill_id bigint not null references game.bills (id),
  since timestamptz not null,
  ended_at timestamptz,
  constraint enemy_designations_not_self check (country_code <> enemy_country_code)
);
alter table game.enemy_designations enable row level security;
comment on table game.enemy_designations is 'A country''s designated enemy, by law; at most one active.';
create unique index enemy_designations_one_active on game.enemy_designations (country_code) where ended_at is null;
create index enemy_designations_enemy_idx on game.enemy_designations (enemy_country_code);
create index enemy_designations_bill_idx on game.enemy_designations (bill_id);

create function game.enemy_of(p_country_code text)
returns text
language sql
stable
set search_path = ''
as $$
  select enemy_country_code from game.enemy_designations where country_code = p_country_code and ended_at is null;
$$;
comment on function game.enemy_of(text) is 'The country p_country_code has designated as its enemy, or null.';

create function game.execute_foreign_bill(p_bill game.bills)
returns void
language plpgsql
set search_path = ''
as $$
begin
  case p_bill.kind
    when 'war_authorization' then
      -- The hold stays open: it is burned when the president launches and refunded on expiry or cancellation.
      insert into game.war_authorizations (country_code, target_country_code, bill_id, hold_id, approved_at, expires_at)
      select p_bill.country_code, p_bill.terms ->> 'country_code', p_bill.id, r.hold_id, game.now(),
             game.now() + make_interval(hours => game.param('war_launch_hours')::integer)
      from game.bill_reservations as r
      where r.bill_id = p_bill.id;
    when 'enemy_designation' then
      update game.enemy_designations set ended_at = game.now()
      where country_code = p_bill.country_code and ended_at is null;
      if p_bill.terms ->> 'country_code' is not null then
        insert into game.enemy_designations (country_code, enemy_country_code, bill_id, since)
        values (p_bill.country_code, p_bill.terms ->> 'country_code', p_bill.id, game.now());
      end if;
    else
      raise exception 'bill_kind_invalid' using errcode = '22023';
  end case;
end;
$$;

create or replace function game.execute_bill(p_bill game.bills)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_reservation record;
begin
  case p_bill.kind
    when 'ordinary' then
      null;
    when 'taxes' then
      update game.country_policies
      set vat = coalesce((p_bill.terms ->> 'vat')::numeric, vat),
          tariff = coalesce((p_bill.terms ->> 'tariff')::numeric, tariff),
          work_tax = coalesce((p_bill.terms ->> 'work_tax')::numeric, work_tax),
          export_tax = coalesce((p_bill.terms ->> 'export_tax')::numeric, export_tax),
          minimum_wage = coalesce((p_bill.terms ->> 'minimum_wage')::bigint, minimum_wage)
      where country_code = p_bill.country_code;
    when 'gold_transfer' then
      if not (select is_active from game.countries where code = p_bill.terms ->> 'country_code') then
        raise exception 'country_inactive' using errcode = '22023';
      end if;
      perform game.capture_hold(
        r.hold_id,
        array[row(null, game.treasury_account(p_bill.terms ->> 'country_code', 'GOLD'),
                  (p_bill.terms ->> 'amount')::bigint, 'gold_transfer', p_bill.title)::game.ledger_leg],
        'bill_execute:' || p_bill.id::text, p_bill.proposed_by
      )
      from game.bill_reservations as r where r.bill_id = p_bill.id;
    when 'ministry_allocation', 'central_bank_allocation' then
      for v_reservation in
        select r.hold_id, h.currency_code, h.amount
        from game.bill_reservations as r join game.ledger_holds as h on h.id = r.hold_id
        where r.bill_id = p_bill.id
        order by r.hold_id
      loop
        perform game.capture_hold(
          v_reservation.hold_id,
          array[row(null,
                    case when p_bill.kind = 'central_bank_allocation'
                         then game.central_bank_account(p_bill.country_code, v_reservation.currency_code)
                         else game.ministry_account(p_bill.country_code, p_bill.terms ->> 'ministry', v_reservation.currency_code) end,
                    v_reservation.amount, p_bill.kind, p_bill.title)::game.ledger_leg],
          'bill_execute:' || p_bill.id::text || ':' || v_reservation.currency_code, p_bill.proposed_by
        );
      end loop;
    when 'currency_issuance' then
      perform game.post(
        'currency_issuance', 'bill_execute:' || p_bill.id::text, p_bill.proposed_by,
        array[row(game.system_account('issuer', p_bill.country_code), game.treasury_account(p_bill.country_code, p_bill.country_code),
                  (p_bill.terms ->> 'amount')::bigint, 'currency_issuance', p_bill.title)::game.ledger_leg]
      );
    else
      perform game.execute_foreign_bill(p_bill);
  end case;
end;
$$;

-- Refunds every pending authorization past its 24 hours, once.
create function game.expire_war_authorizations()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_a game.war_authorizations;
  v_count integer := 0;
begin
  for v_a in
    select * from game.war_authorizations where status = 'pending' and expires_at <= game.now() order by id for update
  loop
    perform game.release_hold(v_a.hold_id, 'war_refund:' || v_a.id::text);
    update game.war_authorizations set status = 'expired', closed_at = game.now() where id = v_a.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Used by the launch of an offensive (W2): the oldest pending authorization against the target, whose 50 GOLD are
-- burned exactly once. Raises no_authorization without one.
create function game.consume_war_authorization(p_country_code text, p_target text, p_actor uuid)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_a game.war_authorizations;
begin
  perform game.expire_war_authorizations();
  select * into v_a from game.war_authorizations
  where country_code = p_country_code and target_country_code = p_target and status = 'pending'
  order by id
  limit 1
  for update;
  if not found then
    raise exception 'no_authorization' using errcode = '22023';
  end if;
  perform game.capture_hold(
    v_a.hold_id,
    array[row(null, game.system_account('sink', 'GOLD'), (select amount from game.ledger_holds where id = v_a.hold_id),
              'war_authorization', null)::game.ledger_leg],
    'war_launch:' || v_a.id::text, p_actor
  );
  update game.war_authorizations set status = 'started', closed_at = game.now() where id = v_a.id;
  return v_a.id;
end;
$$;

create function public.cancel_war_authorization(p_authorization_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_a game.war_authorizations;
begin
  perform game.require_president(v_citizen);
  select * into v_a from game.war_authorizations where id = p_authorization_id for update;
  if not found or v_a.country_code <> v_citizen.country_code then
    raise exception 'authorization_not_found' using errcode = 'P0002';
  end if;
  if v_a.status <> 'pending' then
    raise exception 'authorization_closed' using errcode = '22023';
  end if;
  perform game.release_hold(v_a.hold_id, 'war_refund:' || v_a.id::text);
  update game.war_authorizations set status = 'cancelled', closed_at = game.now() where id = v_a.id;
end;
$$;
comment on function public.cancel_war_authorization(bigint) is 'The president drops an authorization without launching: the 50 GOLD return.';
grant execute on function public.cancel_war_authorization(bigint) to authenticated;

-- The hourly job ---------------------------------------------------------------------------------------------------

-- The world's hourly duties beyond elections: authorizations now, battles from W2.
create function game.hourly_world()
returns jsonb
language sql
set search_path = ''
as $$
  select jsonb_build_object('war_authorizations_expired', game.expire_war_authorizations());
$$;

create or replace function game.job_elections(p_slot timestamptz)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
  v_advanced integer := 0;
  v_closed integer := 0;
  v_bills integer := 0;
  v_party record;
  v_country record;
begin
  for v_id in
    select id from game.elections
    where status <> 'proclaimed' and (registration_closes_at <= game.now())
    order by id
  loop
    perform game.advance_election(v_id);
    v_advanced := v_advanced + 1;
  end loop;
  for v_id in select id from game.congress_motions where status = 'open' and closes_at <= game.now() order by id loop
    perform game.close_motion(v_id);
    v_closed := v_closed + 1;
  end loop;
  for v_id in select id from game.bills where status = 'voting' and closes_at <= game.now() order by id loop
    perform game.close_bill(v_id);
    v_bills := v_bills + 1;
  end loop;
  -- Every party and every country in play always has an election taking candidacies.
  for v_party in select id from game.parties loop
    perform game.party_election(v_party.id);
  end loop;
  for v_country in select code from game.countries where is_active loop
    perform game.national_election(v_country.code, 'president');
    perform game.national_election(v_country.code, 'congress');
  end loop;
  return jsonb_build_object('advanced', v_advanced, 'motions', v_closed, 'bills', v_bills,
                            'minister_rewards', game.reward_ministers())
         || game.hourly_world();
end;
$$;
update game.scheduled_jobs
set description = 'Moves elections on their UTC calendar, closes motions and bills, rewards ministers and runs the world''s hourly duties.'
where name = 'elections';

-- Care: non_enemies now means it -------------------------------------------------------------------------------------

create or replace function game.care_allowed(p_country text, p_patient_country text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case coalesce((select policy from game.care_policies where country_code = p_country), 'universal')
    when 'universal' then true
    when 'non_enemies' then p_patient_country is distinct from game.enemy_of(p_country)
    else p_patient_country = p_country
  end;
$$;

-- Reads ---------------------------------------------------------------------------------------------------------------

create function public.list_war_authorizations(p_country_code text)
returns table (
  authorization_id bigint, target_country_code text, status text, approved_at timestamptz, expires_at timestamptz,
  closed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.target_country_code,
         case when a.status = 'pending' and a.expires_at <= game.now() then 'expired' else a.status end,
         a.approved_at, a.expires_at, a.closed_at
  from game.war_authorizations as a
  where a.country_code = p_country_code
  order by a.status <> 'pending', a.approved_at desc
  limit 20;
$$;
comment on function public.list_war_authorizations(text) is 'A country''s war authorizations: pending ones first.';
grant execute on function public.list_war_authorizations(text) to anon, authenticated;

create function public.get_enemy(p_country_code text)
returns table (enemy_country_code text, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select enemy_country_code, since from game.enemy_designations where country_code = p_country_code and ended_at is null;
$$;
comment on function public.get_enemy(text) is 'The country p_country_code has designated as its enemy; no rows if none.';
grant execute on function public.get_enemy(text) to anon, authenticated;
