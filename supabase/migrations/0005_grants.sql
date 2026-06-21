-- ============================================================
-- ROLE GRANTS (restore Supabase defaults)
-- ============================================================
--
-- RLS is enabled on every public table, but RLS only filters *rows* — the
-- API roles still need table-level privileges to touch the tables at all.
-- Supabase grants these to anon/authenticated/service_role at project
-- creation, but `supabase db reset` drops and recreates the public schema,
-- which wipes those grants. The migrations then recreate the tables with no
-- privileges, so PostgREST returns `42501 permission denied`.
--
-- This migration re-applies Supabase's default grant block so a reset (or a
-- fresh project) ends up identical to a normally-provisioned database. The
-- policies in 0001 — not these grants — are what actually enforce access.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;

-- Tables created by later migrations inherit these grants automatically.
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines  to anon, authenticated, service_role;
