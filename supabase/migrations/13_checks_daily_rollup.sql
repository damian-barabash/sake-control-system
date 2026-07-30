-- Checking every minute instead of every 5 multiplies raw history by 5:
-- ~24.5k rows/day at 17 monitors, ~735k rows and 150+ MB over a 30-day window,
-- on top of a 172 MB database. A monitor that fills its own disk is the exact
-- failure this product exists to prevent.
--
-- So: keep 10 days of raw checks (enough for the 24h and 7d windows and for
-- incident forensics) and fold everything older into one row per monitor per
-- day. 30-day uptime stays exact and costs kilobytes.

create table if not exists public.checks_daily (
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  day date not null,
  total int not null,
  down int not null,
  degraded int not null,
  avg_latency_ms int,
  primary key (monitor_id, day)
);
alter table public.checks_daily enable row level security;
drop policy if exists checks_daily_read on public.checks_daily;
create policy checks_daily_read on public.checks_daily
  for select using (can_access_monitor(monitor_id));

-- Recomputes the last N days (default 3, so one missed night self-heals).
create or replace function public.rollup_checks_daily(p_days int default 3)
returns void
language sql security definer set search_path = public as $$
  insert into public.checks_daily (monitor_id, day, total, down, degraded, avg_latency_ms)
  select monitor_id,
         checked_at::date,
         count(*),
         count(*) filter (where status = 'down'),
         count(*) filter (where status = 'degraded'),
         round(avg(latency_ms))::int
    from public.checks
   where checked_at >= current_date - p_days
     and checked_at < current_date
   group by monitor_id, checked_at::date
  on conflict (monitor_id, day) do update
     set total = excluded.total,
         down = excluded.down,
         degraded = excluded.degraded,
         avg_latency_ms = excluded.avg_latency_ms;
$$;
revoke all on function public.rollup_checks_daily(int) from public, anon, authenticated;
grant execute on function public.rollup_checks_daily(int) to service_role;

-- Backfill every day we still have raw rows for, before retention starts trimming.
select public.rollup_checks_daily(400);

-- 24h and 7d come from raw checks; 30d from the rollup (whole days) plus
-- today's raw rows — the two ranges never overlap, so nothing is double counted.
create or replace function public.monitor_uptime(p_monitor uuid)
returns table (u24 numeric, u7 numeric, u30 numeric)
language sql security definer set search_path = public as $$
  with raw as (
    select
      count(*) filter (where checked_at >= now() - interval '24 hours') as t24,
      count(*) filter (where checked_at >= now() - interval '24 hours' and status <> 'down') as ok24,
      count(*) filter (where checked_at >= now() - interval '7 days') as t7,
      count(*) filter (where checked_at >= now() - interval '7 days' and status <> 'down') as ok7,
      count(*) filter (where checked_at >= current_date) as ttoday,
      count(*) filter (where checked_at >= current_date and status = 'down') as downtoday
      from public.checks
     where monitor_id = p_monitor
       and checked_at >= now() - interval '7 days'
  ), agg as (
    select coalesce(sum(total), 0) as t, coalesce(sum(down), 0) as d
      from public.checks_daily
     where monitor_id = p_monitor
       and day >= current_date - 29
       and day < current_date
  )
  select
    round(100.0 * raw.ok24 / nullif(raw.t24, 0), 2),
    round(100.0 * raw.ok7 / nullif(raw.t7, 0), 2),
    round(100.0 * ((agg.t + raw.ttoday) - (agg.d + raw.downtoday))
          / nullif(agg.t + raw.ttoday, 0), 2)
    from raw, agg;
$$;
revoke all on function public.monitor_uptime(uuid) from public, anon, authenticated;
grant execute on function public.monitor_uptime(uuid) to service_role;

-- Rollup at 03:05, retention at 03:17 — order matters, the aggregate has to be
-- written before the rows it summarises are deleted.
select cron.schedule('sake-checks-rollup', '5 3 * * *', $$ select public.rollup_checks_daily(3); $$);
select cron.unschedule('sake-checks-retention');
select cron.schedule(
  'sake-checks-retention',
  '17 3 * * *',
  $$ delete from public.checks where checked_at < now() - interval '10 days'; $$
);
