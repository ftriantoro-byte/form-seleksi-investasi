-- Modul PM tahap B.1: Folder (Space -> Folder -> List, opsional - List tetap
-- bisa langsung di bawah Space) & Subtask (Task -> sub-Task).
--
-- Ditunda sengaja sejak tahap A.1 (lihat komentar di
-- 20260710130001_pm_enums_dan_tabel.sql) supaya tidak over-engineer sebelum
-- kebutuhan konkretnya jelas.

create table pm_folders (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references pm_spaces (id) on delete cascade,
  nama text not null,
  deskripsi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pm_folders_space_id_idx on pm_folders (space_id);

create trigger trg_pm_folders_updated_at
  before update on pm_folders
  for each row
  execute function public.pm_set_updated_at();

-- List langsung di bawah Space kalau folder_id null (perilaku asli tahap
-- A.1, TIDAK berubah untuk data yang sudah ada), atau di dalam Folder kalau
-- diisi. space_id di pm_lists tetap sumber otorisasi utama (RLS pm_lists
-- dari A.1 tidak perlu diubah) - folder_id murni pengelompokan tampilan.
alter table pm_lists add column folder_id uuid references pm_folders (id) on delete cascade;
create index pm_lists_folder_id_idx on pm_lists (folder_id);

-- Subtask: task_id induk di List yang sama. Divalidasi di Server Action
-- (bukan constraint DB) bahwa parent ada di list_id yang sama - RLS pm_tasks
-- dari A.1 tetap anchor ke list_id, tidak berubah.
alter table pm_tasks add column parent_task_id uuid references pm_tasks (id) on delete cascade;
create index pm_tasks_parent_task_id_idx on pm_tasks (parent_task_id);

alter table pm_folders enable row level security;

create policy pm_akses_folder_anggota_workspace
  on pm_folders for all
  using (pm_can_access_space(space_id))
  with check (pm_can_access_space(space_id));
