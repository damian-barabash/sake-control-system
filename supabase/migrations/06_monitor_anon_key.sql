-- Optional anon/publishable key for `supabase`-type monitors.
-- With a key, run-checks pings /rest/v1/ as a real authenticated API request:
-- the check is honest (PostgREST answers, not just Kong) and the traffic counts
-- as project activity, so free-plan projects are not auto-paused (keep-alive).
-- The anon key is public by design; RLS on monitors already scopes who sees it.
alter table public.monitors add column if not exists anon_key text;
