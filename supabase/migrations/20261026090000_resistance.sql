-- W4 · Resistance in occupied regions: 10 distinct organizers of any citizenship each burn 2 GOLD; the battle starts
-- at once (no cooldown) with the country that held the region before the last occupation attacking and the occupier
-- defending (ties to the occupier); if the resistance wins, the region returns and each organizer receives 5 GOLD
-- from the system (spec sections 6 and 12.5, ADR 0034).
--
-- game.resistance_drives      a drive per occupied region: gathering → started → won | lost
-- game.resistance_organizers  its distinct organizers and their fee
-- A region is occupied when its owner is not its home country and took it by a recorded change; the drive restores
-- it to that change's previous owner.
-- game.finish_battle now settles the drive of a resistance battle.
--
-- public.join_resistance, list_occupied_regions
--
-- Errors (ADR 0005): region_invalid, not_occupied, battle_active, already_organizer, insufficient_funds.
--
-- Rollback: drop public.join_resistance, public.list_occupied_regions, game.occupation, game.resistance_organizers
-- and game.resistance_drives; restore game.finish_battle from 20261025090000; delete the mint reason and the
-- balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('resistance_organizers', 10, 'Distinct organizers a resistance needs to start.'),
  ('resistance_fee', 200, 'GOLD hundredths each organizer pays (burned).'),
  ('resistance_reward', 500, 'GOLD hundredths each organizer receives if the resistance wins (minted).');

insert into game.mint_reasons (kind, authority, description) values
  ('resistance_reward', 'system_reward', 'Reward of each organizer of a victorious resistance.');

create table game.resistance_drives (
  id bigint generated always as identity primary key,
  region_code text not null references game.regions (code),
  restore_country_code text not null references game.countries (code),
  occupier_country_code text not null references game.countries (code),
  status text not null default 'gathering' check (status in ('gathering', 'started', 'won', 'lost')),
  battle_id bigint unique references game.battles (id),
  created_at timestamptz not null,
  started_at timestamptz,
  closed_at timestamptz
);
alter table game.resistance_drives enable row level security;
comment on table game.resistance_drives is 'Resistance in an occupied region: ten organizers, then a battle.';
create unique index resistance_drives_one_open on game.resistance_drives (region_code) where status in ('gathering', 'started');
create index resistance_drives_restore_idx on game.resistance_drives (restore_country_code);
create index resistance_drives_occupier_idx on game.resistance_drives (occupier_country_code);

create table game.resistance_organizers (
  drive_id bigint not null references game.resistance_drives (id),
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  joined_at timestamptz not null,
  primary key (drive_id, user_id)
);
alter table game.resistance_organizers enable row level security;
comment on table game.resistance_organizers is 'The distinct organizers of a resistance; each paid 2 GOLD, burned.';
create index resistance_organizers_user_idx on game.resistance_organizers (user_id);

-- Who held an occupied region before its last occupation, and who occupies it; no rows when it is not occupied.
create function game.occupation(p_region_code text)
returns table (restore_country_code text, occupier_country_code text)
language sql
stable
set search_path = ''
as $$
  select c.from_country_code, r.owner_country_code
  from game.regions as r
  join lateral (
    select from_country_code from game.region_owner_changes
    where region_code = r.code and to_country_code = r.owner_country_code
    order by changed_at desc, id desc
    limit 1
  ) as c on true
  where r.code = p_region_code and r.owner_country_code <> r.home_country_code;
$$;

create function public.join_resistance(p_region_code text, p_key uuid)
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
    array[row(game.citizen_account(v_citizen.user_id, 'GOLD'), game.system_account('sink', 'GOLD'),
              game.param('resistance_fee')::bigint, 'resistance_fee', p_region_code)::game.ledger_leg]
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
  'Joins the resistance of an occupied region for 2 GOLD (burned); the tenth organizer starts the battle at once.';
grant execute on function public.join_resistance(text, uuid) to authenticated;

create or replace function game.finish_battle(p_battle game.battles, p_winner text, p_at timestamptz)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_owner text;
  v_drive game.resistance_drives;
  v_organizer uuid;
begin
  update game.battles set status = 'finished', winner = p_winner, finished_at = p_at where id = p_battle.id;
  delete from game.battle_orders where battle_id = p_battle.id;
  if p_winner = 'attacker' then
    select owner_country_code into v_owner from game.regions where code = p_battle.region_code for update;
    update game.regions set owner_country_code = p_battle.attacker_country_code, updated_at = p_at
    where code = p_battle.region_code;
    insert into game.region_owner_changes (region_code, from_country_code, to_country_code, battle_id, changed_at)
    values (p_battle.region_code, v_owner, p_battle.attacker_country_code, p_battle.id, p_at);
  end if;
  if p_battle.kind = 'resistance' then
    select * into v_drive from game.resistance_drives where battle_id = p_battle.id for update;
    update game.resistance_drives
    set status = case when p_winner = 'attacker' then 'won' else 'lost' end, closed_at = p_at
    where id = v_drive.id;
    if p_winner = 'attacker' then
      for v_organizer in select user_id from game.resistance_organizers where drive_id = v_drive.id order by joined_at loop
        perform game.post(
          'resistance_reward', 'resistance_reward:' || v_drive.id::text || ':' || v_organizer::text, null,
          array[row(game.system_account('issuer', 'GOLD'), game.citizen_account(v_organizer, 'GOLD'),
                    game.param('resistance_reward')::bigint, 'resistance_reward', p_battle.region_code)::game.ledger_leg]
        );
      end loop;
    end if;
  end if;
end;
$$;

create function public.list_occupied_regions()
returns table (
  region_code text, restore_country_code text, occupier_country_code text, organizers integer, needed integer,
  battle_id bigint, i_organize boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.code, o.restore_country_code, o.occupier_country_code,
         coalesce((select count(*)::integer from game.resistance_organizers as x
                   join game.resistance_drives as d on d.id = x.drive_id
                   where d.region_code = r.code and d.status = 'gathering'), 0),
         game.param('resistance_organizers')::integer,
         (select b.id from game.battles as b where b.region_code = r.code and b.status = 'active'),
         exists (select 1 from game.resistance_organizers as x
                 join game.resistance_drives as d on d.id = x.drive_id
                 where d.region_code = r.code and d.status = 'gathering' and x.user_id = auth.uid())
  from game.regions as r
  cross join lateral game.occupation(r.code) as o
  order by o.restore_country_code, r.code;
$$;
comment on function public.list_occupied_regions() is
  'Occupied regions, who they would return to, and how many organizers their resistance has.';
grant execute on function public.list_occupied_regions() to anon, authenticated;
