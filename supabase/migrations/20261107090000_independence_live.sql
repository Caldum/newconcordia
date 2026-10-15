-- The independence war, live: the latest strikes, the damage minute by minute and the player's own share, for a
-- battle screen that refreshes every two seconds (ADR 0046).
--
-- public.independence_feed     the latest strikes of a war: who, how much, any injury, when
-- public.independence_pulse    damage, strikes and fighters per minute over the last 30 minutes
-- public.get_my_independence   the player's damage, strikes and place in a war
-- index independence_attacks_live_idx (war_id, created_at)
--
-- Errors (ADR 0005): none; unknown wars return no rows.
--
-- Rollback: drop the three public functions and the index created here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- A small table read by war and time; built inside the migration's transaction.
-- squawk-ignore require-concurrent-index-creation
create index independence_attacks_live_idx on game.independence_attacks (war_id, created_at);

create function public.independence_feed(p_war_id bigint, p_limit integer default 20)
returns table (attack_id bigint, name text, damage bigint, health_lost integer, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, c.name, a.damage, a.health_lost, a.created_at
  from game.independence_attacks as a
  join game.citizens as c on c.user_id = a.user_id
  where a.war_id = p_war_id
  order by a.created_at desc, a.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
comment on function public.independence_feed(bigint, integer) is
  'The latest strikes of an independence war (at most 50): who, how much, any injury and when.';
grant execute on function public.independence_feed(bigint, integer) to anon, authenticated;

create function public.independence_pulse(p_war_id bigint)
returns table (minute timestamptz, damage bigint, strikes integer, fighters integer)
language sql
stable
security definer
set search_path = ''
as $$
  select date_trunc('minute', a.created_at), sum(a.damage)::bigint, count(*)::integer,
         count(distinct a.user_id)::integer
  from game.independence_attacks as a
  where a.war_id = p_war_id and a.created_at > date_trunc('minute', game.now()) - interval '29 minutes'
  group by 1
  order by 1;
$$;
comment on function public.independence_pulse(bigint) is
  'Damage, strikes and fighters per minute of an independence war over the last 30 minutes (minutes with strikes).';
grant execute on function public.independence_pulse(bigint) to anon, authenticated;

create function public.get_my_independence(p_war_id bigint)
returns table (damage bigint, strikes integer, place integer, fighters integer)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select a.user_id, sum(a.damage)::bigint as damage, count(*)::integer as strikes, min(a.id) as first_id
    from game.independence_attacks as a
    where a.war_id = p_war_id
    group by a.user_id
  ),
  ranked as (
    select t.*, row_number() over (order by t.damage desc, t.first_id)::integer as place from totals as t
  )
  select coalesce(r.damage, 0), coalesce(r.strikes, 0), r.place, (select count(*)::integer from totals)
  from (select 1) as one
  left join ranked as r on r.user_id = auth.uid()
  where auth.uid() is not null;
$$;
comment on function public.get_my_independence(bigint) is
  'The player''s damage, strikes and place in an independence war, and how many fight in it.';
grant execute on function public.get_my_independence(bigint) to authenticated;
