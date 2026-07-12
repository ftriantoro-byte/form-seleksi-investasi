-- Modul PM: Task multi-assignee - satu Task bisa ditugaskan ke lebih dari
-- satu orang (sebelumnya cuma 1 lewat pm_tasks.assignee_id).
--
-- Data assignee_id yang sudah ada di-backfill ke tabel baru INI dulu,
-- BUKAN dipertahankan berdampingan - kolom lama langsung dihapus supaya
-- tidak ada dua sumber kebenaran assignee yang bisa saling tidak sinkron.

create table pm_task_assignees (
  task_id uuid not null references pm_tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  primary key (task_id, user_id)
);

create index pm_task_assignees_user_id_idx on pm_task_assignees (user_id);

alter table pm_task_assignees enable row level security;

create policy pm_akses_task_assignee_anggota_task
  on pm_task_assignees for all
  using (pm_can_access_task(task_id))
  with check (pm_can_access_task(task_id));

-- Backfill dari kolom lama sebelum dihapus.
insert into pm_task_assignees (task_id, user_id)
select id, assignee_id from pm_tasks where assignee_id is not null
on conflict do nothing;

alter table pm_tasks drop column assignee_id;
