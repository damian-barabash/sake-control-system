-- Push notifications + per-project alarm preferences + incident acknowledgement.
-- push_tokens: FCM device tokens, one row per device, owned by the user.
-- alert_prefs: per-user per-project mute switches (push on/off, alarm on/off).
-- incidents: ack fields — "Я знаю" stops the alarm/push repeats.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens(user_id);
alter table public.push_tokens enable row level security;
drop policy if exists push_tokens_own on public.push_tokens;
create policy push_tokens_own on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.alert_prefs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  push_enabled boolean not null default true,
  alarm_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);
alter table public.alert_prefs enable row level security;
drop policy if exists alert_prefs_own on public.alert_prefs;
create policy alert_prefs_own on public.alert_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.incidents add column if not exists acked_at timestamptz;
alter table public.incidents add column if not exists acked_by uuid references public.profiles(id);
alter table public.incidents add column if not exists push_repeats int not null default 0;

-- Ack via RPC (no direct UPDATE policy on incidents): anyone with access to the
-- monitor may acknowledge; first ack wins, idempotent afterwards.
create or replace function public.ack_incident(inc_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  select monitor_id into mid from incidents where id = inc_id;
  if mid is null then
    raise exception 'incident not found';
  end if;
  if not can_access_monitor(mid) then
    raise exception 'forbidden';
  end if;
  update incidents
     set acked_at = coalesce(acked_at, now()),
         acked_by = coalesce(acked_by, auth.uid())
   where id = inc_id;
end $$;
revoke all on function public.ack_incident(uuid) from public;
grant execute on function public.ack_incident(uuid) to authenticated;
