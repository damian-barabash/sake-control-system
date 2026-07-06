-- When the authed keep-alive ping last actually landed (see 06_monitor_anon_key.sql).
-- run-checks fires it only once per 3 days; the regular gateway check stays every cycle.
alter table public.monitors add column if not exists last_keepalive_at timestamptz;
