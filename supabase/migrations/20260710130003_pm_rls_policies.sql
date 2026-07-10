-- Modul PM tahap A.1: Row Level Security. Lihat PM-MODULE-SPEC.md §1-2.

alter table pm_members enable row level security;
alter table pm_workspaces enable row level security;
alter table pm_workspace_members enable row level security;
alter table pm_spaces enable row level security;
alter table pm_lists enable row level security;
alter table pm_tasks enable row level security;

-- ── pm_members ───────────────────────────────────────────────────────────
-- Siapapun yang sudah jadi anggota PM boleh baca daftar anggota (dibutuhkan
-- untuk assignee-picker, @mention nanti, dst). Kelola anggota (tambah/ubah/
-- hapus) admin-only sesuai PM-MODULE-SPEC.md §1.

create policy pm_member_baca_semua_anggota
  on pm_members for select
  using (pm_is_member());

create policy pm_admin_kelola_anggota
  on pm_members for all
  using (pm_is_admin())
  with check (pm_is_admin());

-- ── pm_workspaces ────────────────────────────────────────────────────────

create policy pm_akses_workspace_anggota
  on pm_workspaces for select
  using (pm_can_access_workspace(id));

create policy pm_member_buat_workspace
  on pm_workspaces for insert
  with check (pm_is_member() and created_by = auth.uid());

create policy pm_akses_update_workspace_anggota
  on pm_workspaces for update
  using (pm_can_access_workspace(id))
  with check (pm_can_access_workspace(id));

-- Hapus Workspace admin-only (PM-MODULE-SPEC.md §1: "aksi admin-only: hapus
-- Workspace, kelola anggota PM").
create policy pm_admin_hapus_workspace
  on pm_workspaces for delete
  using (pm_is_admin());

-- ── pm_workspace_members ─────────────────────────────────────────────────

create policy pm_akses_baca_workspace_members
  on pm_workspace_members for select
  using (pm_can_access_workspace(workspace_id));

create policy pm_admin_kelola_workspace_members
  on pm_workspace_members for insert
  with check (pm_is_admin());

create policy pm_admin_hapus_workspace_members
  on pm_workspace_members for delete
  using (pm_is_admin());

-- ── pm_spaces / pm_lists / pm_tasks ──────────────────────────────────────
-- Member Workspace akses penuh (baca+tulis) ke semua Space/List/Task di
-- dalamnya — tidak ada Guest/akses granular per-Space (PM-MODULE-SPEC.md §1).

create policy pm_akses_space_anggota_workspace
  on pm_spaces for all
  using (pm_can_access_workspace(workspace_id))
  with check (pm_can_access_workspace(workspace_id));

create policy pm_akses_list_anggota_workspace
  on pm_lists for all
  using (pm_can_access_space(space_id))
  with check (pm_can_access_space(space_id));

create policy pm_akses_task_anggota_workspace
  on pm_tasks for all
  using (pm_can_access_list(list_id))
  with check (pm_can_access_list(list_id));
