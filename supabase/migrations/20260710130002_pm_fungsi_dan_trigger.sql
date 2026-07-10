-- Modul PM tahap A.1: fungsi helper RLS & trigger updated_at.
--
-- Helper harus "language plpgsql", BUKAN "language sql" — fungsi SQL
-- satu-statement stable berpotensi di-inline planner ke query pemanggil,
-- yang menghilangkan proteksi SECURITY DEFINER dan bisa memicu "infinite
-- recursion detected in policy" persis seperti yang pernah terjadi di modul
-- form (lihat 20260709120007_fix_rls_recursion.sql). plpgsql tidak di-inline.

create or replace function public.pm_is_member()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (select 1 from pm_members where user_id = auth.uid());
end;
$$;

create or replace function public.pm_is_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1 from pm_members where user_id = auth.uid() and role = 'admin'
  );
end;
$$;

create or replace function public.pm_can_access_workspace(p_workspace_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return pm_is_admin() or exists (
    select 1 from pm_workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid()
  );
end;
$$;

create or replace function public.pm_can_access_space(p_space_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  select workspace_id into v_workspace_id from pm_spaces where id = p_space_id;
  return v_workspace_id is not null and pm_can_access_workspace(v_workspace_id);
end;
$$;

create or replace function public.pm_can_access_list(p_list_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_space_id uuid;
begin
  select space_id into v_space_id from pm_lists where id = p_list_id;
  return v_space_id is not null and pm_can_access_space(v_space_id);
end;
$$;

create or replace function public.pm_can_access_task(p_task_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_list_id uuid;
begin
  select list_id into v_list_id from pm_tasks where id = p_task_id;
  return v_list_id is not null and pm_can_access_list(v_list_id);
end;
$$;

-- Auto-update kolom updated_at, dipakai berulang lewat trigger per tabel.
create or replace function public.pm_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_pm_workspaces_updated_at
  before update on pm_workspaces
  for each row
  execute function public.pm_set_updated_at();

create trigger trg_pm_spaces_updated_at
  before update on pm_spaces
  for each row
  execute function public.pm_set_updated_at();

create trigger trg_pm_lists_updated_at
  before update on pm_lists
  for each row
  execute function public.pm_set_updated_at();

create trigger trg_pm_tasks_updated_at
  before update on pm_tasks
  for each row
  execute function public.pm_set_updated_at();
