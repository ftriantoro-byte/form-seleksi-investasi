-- Modul PM tahap A.3: perbaiki kebijakan pm_workspaces.
--
-- PM-MODULE-SPEC.md §1: "admin ... bisa invite anggota baru ... dan kelola
-- Workspace; member akses penuh ke Workspace yang dia ikuti tapi tidak bisa
-- kelola anggota." Dibaca ulang saat membangun CRUD Workspace di tahap A.3:
-- "kelola Workspace" berarti create/rename/delete Workspace itu sendiri
-- adalah tugas admin, BUKAN pm_is_member() seperti kebijakan insert/update
-- yang ditulis di tahap A.1. Member tetap akses penuh ke ISI Workspace
-- (Space/List/Task) yang mereka ikuti - itu tidak berubah di sini.

drop policy if exists pm_member_buat_workspace on pm_workspaces;
drop policy if exists pm_akses_update_workspace_anggota on pm_workspaces;

create policy pm_admin_buat_workspace
  on pm_workspaces for insert
  with check (pm_is_admin() and created_by = auth.uid());

create policy pm_admin_update_workspace
  on pm_workspaces for update
  using (pm_is_admin())
  with check (pm_is_admin());
