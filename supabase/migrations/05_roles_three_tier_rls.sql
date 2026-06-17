-- Three-tier role model, step B (SAKE). Applied live via MCP 2026-06-17.
--   moderator = super-admin (sees ALL), admin = tenant owner (own projects), member = client.

-- ---------- helper functions ----------
create or replace function public.is_moderator(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from profiles where id = uid and role = 'moderator');
$$;

create or replace function public.is_staff(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from profiles where id = uid and role in ('admin','moderator'));
$$;

create or replace function public.owns_project(pid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from projects where id = pid and created_by = uid);
$$;

-- pure membership (no longer implies admin); access wrappers add staff reach
create or replace function public.is_project_member(pid uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from project_members where project_id = pid and user_id = auth.uid());
$$;

create or replace function public.can_access_project(pid uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select is_moderator() or owns_project(pid) or is_project_member(pid);
$$;

create or replace function public.can_access_monitor(mid uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from monitors m where m.id = mid and can_access_project(m.project_id));
$$;

-- ---------- triggers ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare want text;
begin
  if new.email = 'office@barabashflow.pl' then
    want := 'moderator';
  else
    want := coalesce(new.raw_user_meta_data->>'role', 'member');
    if want not in ('admin','member') then want := 'member'; end if;
  end if;
  insert into public.profiles (id, email, full_name, alert_email, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    want::user_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not is_moderator(auth.uid()) then
    raise exception 'only moderator can change role';
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.guard_profile_role() from anon, authenticated;

-- ---------- promote founder ----------
update public.profiles set role = 'moderator'
where id = '1916d13c-b5c9-4c61-a8db-c2b2baf8ac5e';

-- ---------- RLS: projects ----------
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated
  using (is_moderator() or created_by = auth.uid() or is_project_member(id));
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated
  with check (is_staff() and created_by = auth.uid());
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated
  using (is_moderator() or created_by = auth.uid())
  with check (is_moderator() or created_by = auth.uid());
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated
  using (is_moderator() or created_by = auth.uid());

-- ---------- RLS: project_members ----------
drop policy if exists pm_select on public.project_members;
create policy pm_select on public.project_members for select to authenticated
  using (is_moderator() or owns_project(project_id) or user_id = auth.uid() or is_project_member(project_id));
drop policy if exists pm_insert on public.project_members;
create policy pm_insert on public.project_members for insert to authenticated
  with check (is_moderator() or owns_project(project_id));
drop policy if exists pm_delete on public.project_members;
create policy pm_delete on public.project_members for delete to authenticated
  using (is_moderator() or owns_project(project_id));

-- ---------- RLS: monitors ----------
drop policy if exists monitors_select on public.monitors;
create policy monitors_select on public.monitors for select to authenticated
  using (can_access_project(project_id));
drop policy if exists monitors_insert on public.monitors;
create policy monitors_insert on public.monitors for insert to authenticated
  with check (is_moderator() or owns_project(project_id));
drop policy if exists monitors_update on public.monitors;
create policy monitors_update on public.monitors for update to authenticated
  using (is_moderator() or owns_project(project_id))
  with check (is_moderator() or owns_project(project_id));
drop policy if exists monitors_delete on public.monitors;
create policy monitors_delete on public.monitors for delete to authenticated
  using (is_moderator() or owns_project(project_id));

-- monitor_state / checks / incidents select policies already use can_access_monitor(),
-- whose definition we just widened to staff+owner — no recreate needed.

-- ---------- RLS: profiles ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or is_moderator()
    or exists (
      select 1 from project_members pm1
      join project_members pm2 on pm1.project_id = pm2.project_id
      where pm1.user_id = auth.uid() and pm2.user_id = profiles.id
    )
    or exists (
      select 1 from project_members pm
      where pm.user_id = profiles.id and owns_project(pm.project_id, auth.uid())
    )
    or exists (
      select 1 from project_members pm
      where pm.user_id = auth.uid() and owns_project(pm.project_id, profiles.id)
    )
  );
drop policy if exists profiles_insert_staff on public.profiles;
create policy profiles_insert_staff on public.profiles for insert to authenticated
  with check (is_staff());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() or is_moderator())
  with check (id = auth.uid() or is_moderator());
