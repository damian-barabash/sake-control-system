-- Migration 14 — billing (Paddle, 7-day trial) + RLS performance (2026-08-03)
--
-- Billing: per-tenant (admin) subscription, 7-day free trial from signup, paid
-- monthly/yearly Paddle subscription. Members (clients) inherit access from the
-- owner-admin of their projects. Moderator is never billed.
--
-- Performance: the SELECT policies on checks / checks_daily / incidents /
-- monitor_state / notification_log called can_access_monitor(monitor_id) PER ROW.
-- A 24h dashboard count over ~26k checks rows took 8.7 s of pure RLS overhead.
-- Rewritten to `monitor_id in (select accessible_monitor_ids())` — Postgres runs
-- the subquery ONCE as a hashed subplan, membership is then O(1) per row.

-- ── 1. Billing columns ────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists trial_ends_at          timestamptz default (now() + interval '7 days'),
  add column if not exists subscription_status    text not null default 'trialing',
  add column if not exists subscription_ends_at   timestamptz,
  add column if not exists paddle_customer_id     text,
  add column if not exists paddle_subscription_id text;

do $$ begin
  alter table public.profiles
    add constraint profiles_subscription_status_chk
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'expired'));
exception when duplicate_object then null; end $$;

update public.profiles set trial_ends_at = created_at + interval '7 days' where trial_ends_at is null;

-- Grandfather: every account existing at migration time gets a lifetime
-- subscription (same call as Ticket Flow migration 20).
update public.profiles set subscription_status = 'active', subscription_ends_at = null;

-- ── 2. New signups start a 7-day trial ───────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare want text;
begin
  if new.email = 'office@barabashflow.pl' then
    want := 'moderator';
  else
    want := coalesce(new.raw_user_meta_data->>'role', 'member');
    if want not in ('admin','member') then want := 'member'; end if;
  end if;
  insert into public.profiles (id, email, full_name, alert_email, role, trial_ends_at, subscription_status)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    want::user_role,
    now() + interval '7 days',
    'trialing'
  )
  on conflict (id) do nothing;
  return new;
end;
$fn$;

-- ── 3. Billing columns are backend-only ──────────────────────────────────────
-- Only service role / migrations (auth.uid() is null) may change them: an end
-- user can NEVER self-grant access.
create or replace function public.guard_profile_billing()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
begin
  if auth.uid() is not null then
    if new.subscription_status       is distinct from old.subscription_status
       or new.subscription_ends_at   is distinct from old.subscription_ends_at
       or new.trial_ends_at          is distinct from old.trial_ends_at
       or new.paddle_customer_id     is distinct from old.paddle_customer_id
       or new.paddle_subscription_id is distinct from old.paddle_subscription_id then
      raise exception 'billing fields are managed by the system';
    end if;
  end if;
  return new;
end;
$fn$;
revoke execute on function public.guard_profile_billing() from public, anon, authenticated;

drop trigger if exists guard_profile_billing on public.profiles;
create trigger guard_profile_billing before update on public.profiles
  for each row execute function public.guard_profile_billing();

-- ── 4. Entitlement helper (backend use) ──────────────────────────────────────
create or replace function public.is_entitled(p_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $fn$
  select coalesce(
    (select (subscription_status = 'active' and (subscription_ends_at is null or subscription_ends_at > now()))
            or (trial_ends_at is not null and trial_ends_at > now())
       from public.profiles where id = p_id),
    false);
$fn$;
revoke execute on function public.is_entitled(uuid) from public, anon, authenticated;

-- ── 5. FK fix for account deletion ───────────────────────────────────────────
-- incidents.acked_by was NO ACTION → deleting a user who ever pressed "Я знаю"
-- would fail with an FK error. The ack is historical data; keep the incident,
-- drop the pointer.
do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'public.incidents'::regclass
     and confrelid = 'public.profiles'::regclass;
  if c is not null then
    execute format('alter table public.incidents drop constraint %I', c);
  end if;
  alter table public.incidents
    add constraint incidents_acked_by_fkey
    foreign key (acked_by) references public.profiles(id) on delete set null;
end $$;

-- ── 6. RLS performance: hashed monitor-access subplan ────────────────────────
-- All monitors the caller may see, computed once per statement (18 rows) instead
-- of once per checks row (26k+ calls).
create or replace function public.accessible_monitor_ids()
returns setof uuid
language sql stable security definer set search_path to 'public' as $fn$
  select m.id
    from public.monitors m
    join public.projects p on p.id = m.project_id
   where public.is_moderator(auth.uid())
      or p.created_by = auth.uid()
      or exists (select 1 from public.project_members pm
                  where pm.project_id = p.id and pm.user_id = auth.uid());
$fn$;
-- Policies evaluate as the querying role, so authenticated needs EXECUTE.
revoke execute on function public.accessible_monitor_ids() from public, anon;
grant execute on function public.accessible_monitor_ids() to authenticated, service_role;

drop policy if exists checks_select on public.checks;
create policy checks_select on public.checks for select
  using (monitor_id in (select public.accessible_monitor_ids()));

drop policy if exists checks_daily_read on public.checks_daily;
create policy checks_daily_read on public.checks_daily for select
  using (monitor_id in (select public.accessible_monitor_ids()));

drop policy if exists incidents_select on public.incidents;
create policy incidents_select on public.incidents for select
  using (monitor_id in (select public.accessible_monitor_ids()));

drop policy if exists ms_select on public.monitor_state;
create policy ms_select on public.monitor_state for select
  using (monitor_id in (select public.accessible_monitor_ids()));

drop policy if exists notification_log_read on public.notification_log;
create policy notification_log_read on public.notification_log for select
  using (monitor_id in (select public.accessible_monitor_ids()));

-- ── 7. Dashboard 24h aggregate in one round trip ─────────────────────────────
-- The old client pulled the newest 600 checks rows (≈35 min of data at minute
-- cadence × 17 monitors) and bucketed in JS, plus an exact count — both slow and
-- wrong. This returns the true 24h hourly latency series + counts in one query.
create or replace function public.dashboard_checks_24h()
returns jsonb
language sql stable security definer set search_path to 'public' as $fn$
  with rows as (
    select checked_at, latency_ms, status
      from public.checks
     where checked_at > now() - interval '24 hours'
       and monitor_id in (select public.accessible_monitor_ids())
  )
  select jsonb_build_object(
    'count', (select count(*) from rows),
    'series', coalesce((
      select jsonb_agg(avg_ms order by h)
        from (select date_trunc('hour', checked_at) as h, round(avg(latency_ms))::int as avg_ms
                from rows where status <> 'down' and latency_ms is not null
               group by 1) s), '[]'::jsonb),
    'avg', (select round(avg(latency_ms))::int from rows where status <> 'down' and latency_ms is not null),
    'now', (select latency_ms from rows
             where status <> 'down' and latency_ms is not null
             order by checked_at desc limit 1)
  );
$fn$;
revoke execute on function public.dashboard_checks_24h() from public, anon;
grant execute on function public.dashboard_checks_24h() to authenticated, service_role;
