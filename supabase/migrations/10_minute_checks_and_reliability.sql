-- 2026-07-30 — "every minute, ironclad" pass.
--
-- 1. Checks move from a 5-minute to a 1-minute cadence (default + backfill).
-- 2. claim_due_monitors(): atomically claims the due batch and pushes next_run_at
--    forward BEFORE the checks run. With a 1-minute cron this is what stops two
--    overlapping invocations from checking the same monitor twice (duplicate
--    history rows, duplicate incidents, duplicate alarms).
-- 3. monitor_uptime(): uptime is now counted server-side. The old code pulled
--    every check row of the last 24h per monitor per cycle — at 1-minute cadence
--    that is 1440 rows x 21 monitors x 60 times an hour.
-- 4. notification_log: every email and push attempt is recorded, so "did the
--    alarm actually go out?" is answerable instead of guesswork.
-- 5. checks.note / monitor_state.last_note: diagnostic breadcrumb for a check
--    that was rescued by the fallback resolver (see run-checks v9).

-- ---------------------------------------------------------------- 1. cadence
alter table public.monitors alter column interval_seconds set default 60;
update public.monitors set interval_seconds = 60 where interval_seconds is null or interval_seconds > 60;

-- history grew 5x; make the per-monitor time-range scans index-only friendly
create index if not exists checks_monitor_time_idx on public.checks (monitor_id, checked_at desc);
create index if not exists incidents_open_idx on public.incidents (status, acked_at) where status = 'open';

-- --------------------------------------------------------------- 5. notes
alter table public.checks add column if not exists note text;
alter table public.monitor_state add column if not exists last_note text;

-- ---------------------------------------------------------- 2. atomic claim
create or replace function public.claim_due_monitors(p_limit int default 100)
returns setof jsonb
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select m.id
      from public.monitors m
     where m.enabled
       and m.executor = 'cloud'
       and (m.next_run_at is null or m.next_run_at <= now())
     order by m.next_run_at nulls first
     limit p_limit
     for update skip locked
  ), claimed as (
    update public.monitors m
       -- claim first: a crashed run costs one skipped cycle, never a double check
       set next_run_at = now() + make_interval(secs => greatest(coalesce(m.interval_seconds, 60), 30))
      from due
     where m.id = due.id
    returning m.*
  )
  select to_jsonb(c) || jsonb_build_object('monitor_state', to_jsonb(s))
    from claimed c
    left join public.monitor_state s on s.monitor_id = c.id;
end $$;
revoke all on function public.claim_due_monitors(int) from public, anon, authenticated;
grant execute on function public.claim_due_monitors(int) to service_role;

-- ------------------------------------------------------- 3. server-side uptime
-- degraded counts as up: the service answered, just slowly.
create or replace function public.monitor_uptime(p_monitor uuid)
returns table (u24 numeric, u7 numeric, u30 numeric)
language sql security definer set search_path = public as $$
  select
    round(100.0 * count(*) filter (where checked_at >= now() - interval '24 hours' and status <> 'down')
          / nullif(count(*) filter (where checked_at >= now() - interval '24 hours'), 0), 2),
    round(100.0 * count(*) filter (where checked_at >= now() - interval '7 days' and status <> 'down')
          / nullif(count(*) filter (where checked_at >= now() - interval '7 days'), 0), 2),
    round(100.0 * count(*) filter (where status <> 'down')
          / nullif(count(*), 0), 2)
    from public.checks
   where monitor_id = p_monitor
     and checked_at >= now() - interval '30 days';
$$;
revoke all on function public.monitor_uptime(uuid) from public, anon;
grant execute on function public.monitor_uptime(uuid) to service_role;

-- --------------------------------------------------------- 4. delivery journal
create table if not exists public.notification_log (
  id bigint generated always as identity primary key,
  incident_id uuid references public.incidents(id) on delete set null,
  monitor_id uuid references public.monitors(id) on delete cascade,
  channel text not null check (channel in ('email', 'push')),
  kind text not null,                       -- open | repeat | resolved | test
  target text,                              -- email address, or a truncated device token
  ok boolean not null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists notification_log_time_idx on public.notification_log (created_at desc);
create index if not exists notification_log_monitor_idx on public.notification_log (monitor_id, created_at desc);

alter table public.notification_log enable row level security;
drop policy if exists notification_log_read on public.notification_log;
create policy notification_log_read on public.notification_log
  for select using (is_moderator(auth.uid()) or can_access_monitor(monitor_id));
-- writes are service-role only (RLS is bypassed there); no insert policy on purpose.

-- ------------------------------------------------------------ device metadata
-- so the app's notification diagnostics can show "this phone is registered,
-- last seen X" — the missing piece when alarms silently go nowhere.
alter table public.push_tokens add column if not exists last_seen_at timestamptz not null default now();
alter table public.push_tokens add column if not exists device text;

-- ---------------------------------------------------------------- retention
select cron.schedule(
  'sake-notification-log-retention',
  '23 3 * * *',
  $$ delete from public.notification_log where created_at < now() - interval '30 days'; $$
);
