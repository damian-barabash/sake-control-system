-- 16 — audit fixes (2026-11-23)
--
-- 1. cron.job_run_details was never purged: one row per cron run, each carrying
--    the full command text (JWT included, ~1.5 kB). At a 1-minute cadence that
--    grew to 396 MB in six months and pushed the database to 485 MB of the
--    500 MB free-plan limit. Nightly purge, keep 7 days.
-- 2. claim_due_monitors(): a skipped cycle left next_run_at permanently behind
--    now() (it only ever advanced by one interval per claim), so every monitor
--    was always "due" and any extra invocation re-checked the whole fleet.
--    When a monitor is a full interval behind, re-anchor it to the minute grid.
-- 3. monitors.keepalive_alerted_at: lets run-checks alert (once a day) when a
--    Supabase keep-alive has not landed for 48 h.

alter table public.monitors add column if not exists keepalive_alerted_at timestamptz;

create or replace function public.claim_due_monitors(p_limit integer default 100)
 returns setof jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
       set next_run_at = case
             -- first run, or at least one whole interval behind: re-anchor to the
             -- minute grid (cron fires just after :00, so the slot is always due
             -- on the next tick and never due twice within one)
             when m.next_run_at is null
               or m.next_run_at + make_interval(secs => greatest(coalesce(m.interval_seconds, 60), 30)) <= now()
               then date_trunc('minute', now()) + make_interval(secs => greatest(coalesce(m.interval_seconds, 60), 30))
             -- on schedule: advance from the slot, not from now(), so it never drifts
             else m.next_run_at + make_interval(secs => greatest(coalesce(m.interval_seconds, 60), 30))
           end
      from due
     where m.id = due.id
    returning m.*
  )
  select to_jsonb(c) || jsonb_build_object('monitor_state', to_jsonb(s))
    from claimed c
    left join public.monitor_state s on s.monitor_id = c.id;
end $function$;

select cron.unschedule('sake-cron-log-retention')
 where exists (select 1 from cron.job where jobname = 'sake-cron-log-retention');
select cron.schedule(
  'sake-cron-log-retention',
  '29 3 * * *',
  $$ delete from cron.job_run_details where start_time < now() - interval '7 days'; $$
);
