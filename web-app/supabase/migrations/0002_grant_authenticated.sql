-- 0001_init.sql hat RLS-Policies angelegt, aber keine Tabellen-Grants fuer die
-- Rolle "authenticated" vergeben. RLS-Policies und GRANTs sind in Postgres
-- getrennte Mechanismen: ohne GRANT schlaegt jeder Zugriff mit
-- "permission denied for table ..." fehl, bevor RLS ueberhaupt greift.

grant select, insert, update on public.blitztext_user_settings to authenticated;
grant select on public.blitztext_usage_counters to authenticated;
