-- Modul PM tahap C.2: Template List (simpan struktur List, instansiasi ulang
-- jadi List baru kapan saja).
--
-- CATATAN CAKUPAN: template menyimpan SNAPSHOT (bukan referensi hidup) dari
-- custom_status_labels & definisi Custom Field milik List sumber saat tombol
-- "Simpan sebagai Template" ditekan - kalau List sumbernya diedit/dihapus
-- setelahnya, Template tetap utuh tidak ikut berubah. Template di-scope per
-- Workspace (bukan lintas Workspace), konsisten dengan pola akses
-- member-level Space/List yang sudah ada.

create table pm_list_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references pm_workspaces (id) on delete cascade,
  nama text not null,
  custom_status_labels jsonb,
  custom_fields jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index pm_list_templates_workspace_id_idx on pm_list_templates (workspace_id);

alter table pm_list_templates enable row level security;

create policy pm_akses_template_anggota_workspace
  on pm_list_templates for all
  using (pm_can_access_workspace(workspace_id))
  with check (pm_can_access_workspace(workspace_id));
