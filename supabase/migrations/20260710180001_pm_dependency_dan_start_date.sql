-- Modul PM tahap B.2: Task Dependency (buat Gantt) & start_date (buat Gantt
-- perlu rentang tanggal, bukan cuma due_date tunggal).

alter table pm_tasks add column start_date date;

create table pm_task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references pm_tasks (id) on delete cascade,
  depends_on_task_id uuid not null references pm_tasks (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

create index pm_task_dependencies_task_id_idx on pm_task_dependencies (task_id);
create index pm_task_dependencies_depends_on_task_id_idx on pm_task_dependencies (depends_on_task_id);

alter table pm_task_dependencies enable row level security;

-- Dependency menghubungkan 2 Task yang harus di List yang sama (divalidasi
-- di Server Action, bukan constraint DB) - otorisasi tetap cukup lewat
-- pm_can_access_task() pada task_id saja (kalau task_id bisa diakses, kedua
-- task pasti di List/Space/Workspace yang sama karena divalidasi satu List).
create policy pm_akses_dependency_anggota_task
  on pm_task_dependencies for all
  using (pm_can_access_task(task_id))
  with check (pm_can_access_task(task_id));
