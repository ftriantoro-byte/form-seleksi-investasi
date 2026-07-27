-- Riwayat siklus Task berulang yang sudah selesai (permintaan user: "task
-- jangan hilang, masuk ke list archive" - terutama Task berulang, yang
-- sebelumnya begitu ditandai Done LANGSUNG di-reset balik ke to_do +
-- due_date maju ke siklus berikutnya TANPA jejak sama sekali bahwa siklus
-- sebelumnya sudah selesai). Baris Task berulang TETAP auto-lanjut ke
-- siklus berikutnya seperti semula (lihat applyRecurrenceIfDone di
-- actions/pm/tasks.ts) - tabel ini murni catatan riwayat tambahan, bukan
-- pengganti mekanisme itu.

create table pm_task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references pm_tasks (id) on delete cascade,
  due_date date not null,
  completed_at timestamptz not null default now()
);

create index pm_task_completions_task_id_idx on pm_task_completions (task_id);

alter table pm_task_completions enable row level security;

create policy pm_akses_task_completion_anggota_task
  on pm_task_completions for all
  using (pm_can_access_task(task_id))
  with check (pm_can_access_task(task_id));
