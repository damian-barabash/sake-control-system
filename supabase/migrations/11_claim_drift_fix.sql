-- Drift fix: schedule the next run from the SLOT the monitor was due in, not
-- from "now". Adding the interval to now() pushes the due time a few hundred ms
-- later every cycle until it slips past the next cron tick and a whole minute
-- gets skipped. Anchoring to next_run_at keeps the cadence exact.
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
       set next_run_at = case
             -- first run, or so far behind that catching up would burst
             when m.next_run_at is null or m.next_run_at < now() - interval '10 minutes'
               then now() + make_interval(secs => greatest(coalesce(m.interval_seconds, 60), 30))
             else m.next_run_at + make_interval(secs => greatest(coalesce(m.interval_seconds, 60), 30))
           end
      from due
     where m.id = due.id
    returning m.*
  )
  select to_jsonb(c) || jsonb_build_object('monitor_state', to_jsonb(s))
    from claimed c
    left join public.monitor_state s on s.monitor_id = c.id;
end $$;
