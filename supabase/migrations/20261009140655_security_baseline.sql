-- Security baseline: the API roles get nothing unless a later migration grants it explicitly.
--
-- Supabase grants anon/authenticated full table rights and EXECUTE on every new object in
-- `public`. Concordia exposes only functions (RPC), so new tables, sequences and functions
-- start closed, and each public function is granted one by one next to its definition.
-- Game state lives in the private `game` schema, which the Data API never exposes.
--
-- Rollback: re-grant the Supabase defaults with `alter default privileges ... grant` for the
-- same roles and object types, then `drop schema game` once it is empty.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
-- EXECUTE to PUBLIC is a global default, so it can only be revoked globally (no `in schema`).
alter default privileges for role postgres
  revoke execute on functions from public;

create schema game;
comment on schema game is 'Private game state and rules. Never exposed through the Data API.';
revoke all on schema game from public;
