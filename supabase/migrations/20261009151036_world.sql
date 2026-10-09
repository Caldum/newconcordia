-- D03 · World: countries, regions and their current owner.
--
-- Every country on the map is listed (250), in play or not, so the waitlist and the map can name them.
-- Regions exist only for countries in play; their code is fixed (ARG-05 is Cuyo) and shared with the
-- map (data/map/world-regions.json). Reference rows are inserted by the next migration, generated from
-- data/map/world.json. Ownership history arrives with conquest (D18).
--
-- Rollback: drop the two public functions, then game.regions and game.countries.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table game.countries (
  code text primary key check (code ~ '^[A-Z]{3}$'),
  iso2 text check (iso2 ~ '^[A-Z]{2}$'),
  name_es text not null check (name_es <> ''),
  name_en text not null check (name_en <> ''),
  official_name_es text check (official_name_es <> ''),
  official_name_en text check (official_name_en <> ''),
  color text check (color ~ '^#[0-9A-F]{6}$'),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A country in play is drawn and named on the citizenship document.
  constraint countries_active_are_complete check (
    not is_active
    or (color is not null and official_name_es is not null and official_name_en is not null)
  )
);
alter table game.countries enable row level security;
comment on table game.countries is 'Every country on the map. is_active marks the countries in play.';

create table game.regions (
  code text primary key check (code ~ '^[A-Z]{3}-[0-9]{2}$'),
  home_country_code text not null references game.countries (code),
  owner_country_code text not null references game.countries (code),
  name text not null check (name <> ''),
  provinces text[] not null,
  -- Disputed territories start disabled and the admin panel enables them (D07).
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regions_code_matches_home check (left(code, 3) = home_country_code)
);
alter table game.regions enable row level security;
comment on table game.regions is 'Regions of the countries in play, with their fixed code and current owner.';
comment on column game.regions.owner_country_code is 'Current owner; differs from home_country_code when occupied.';

-- Frequent reads: regions a country owns (map, country page) and regions of a home country (resistance).
create index regions_owner_country_code_idx on game.regions (owner_country_code);
create index regions_home_country_code_idx on game.regions (home_country_code);

-- Public read for the map and the pickers ----------------------------------------------------------

create function public.list_countries()
returns table (
  code text,
  iso2 text,
  name_es text,
  name_en text,
  official_name_es text,
  official_name_en text,
  color text,
  is_active boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.code, c.iso2, c.name_es, c.name_en, c.official_name_es, c.official_name_en, c.color, c.is_active
  from game.countries as c
  order by c.code;
$$;
comment on function public.list_countries() is 'Every country with its names, color and whether it is in play.';
grant execute on function public.list_countries() to anon, authenticated;

create function public.list_regions()
returns table (
  code text,
  name text,
  home_country_code text,
  owner_country_code text,
  is_enabled boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.code, r.name, r.home_country_code, r.owner_country_code, r.is_enabled
  from game.regions as r
  order by r.code;
$$;
comment on function public.list_regions() is 'Every region with its home country and current owner (map state).';
grant execute on function public.list_regions() to anon, authenticated;
