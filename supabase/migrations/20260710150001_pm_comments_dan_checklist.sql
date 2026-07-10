-- Modul PM tahap A.4: tabel Comment & Checklist per Task.
--
-- Otorisasi lewat pm_can_access_task() (dibuat di tahap A.1, sudah menelusuri
-- rantai task -> list -> space -> workspace) - sama persis pola yang dipakai
-- pm_spaces/pm_lists/pm_tasks di 20260710130003_pm_rls_policies.sql.

create table pm_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references pm_tasks (id) on delete cascade,
  konten text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index pm_comments_task_id_idx on pm_comments (task_id);

create table pm_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references pm_tasks (id) on delete cascade,
  konten text not null,
  selesai boolean not null default false,
  urutan integer not null default 0,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index pm_checklist_items_task_id_idx on pm_checklist_items (task_id);

alter table pm_comments enable row level security;
alter table pm_checklist_items enable row level security;

-- Comment: baca & buat oleh siapapun yang akses Task-nya; hapus hanya oleh
-- penulis komentar sendiri (bukan sesama anggota Workspace - komentar orang
-- lain tidak boleh dihapus meski satu Workspace).
create policy pm_akses_baca_comment
  on pm_comments for select
  using (pm_can_access_task(task_id));

create policy pm_buat_comment_anggota_task
  on pm_comments for insert
  with check (pm_can_access_task(task_id) and created_by = auth.uid());

create policy pm_hapus_comment_milik_sendiri
  on pm_comments for delete
  using (created_by = auth.uid());

-- Checklist item: akses penuh (baca/buat/centang/hapus) untuk semua anggota
-- Workspace yang bisa akses Task-nya - konsisten dengan pm_tasks (tidak ada
-- pembatasan "hanya pembuat item" untuk checklist, beda dengan comment).
create policy pm_akses_checklist_anggota_task
  on pm_checklist_items for all
  using (pm_can_access_task(task_id))
  with check (pm_can_access_task(task_id));
