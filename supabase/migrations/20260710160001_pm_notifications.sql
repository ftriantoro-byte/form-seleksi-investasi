-- Modul PM tahap A.7: notifikasi in-app sederhana.
--
-- Cakupan sengaja minimal (sesuai "sederhana" di PM-MODULE-SPEC.md §3 A.7,
-- belum ada Realtime/cron - itu B.3 dan seterusnya): 2 event pemicu, dibuat
-- langsung di Server Action terkait, bukan trigger DB - supaya pesan
-- notifikasi bisa pakai teks yang sudah divalidasi di application layer
-- (nama Task dsb):
--   1. Task di-assign ke seseorang (create/update Task) -> notifikasi ke assignee.
--   2. Komentar baru di Task -> notifikasi ke assignee Task (kalau bukan penulis sendiri).

create type pm_notification_type as enum ('task_assigned', 'task_commented');

create table pm_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type pm_notification_type not null,
  task_id uuid references pm_tasks (id) on delete cascade,
  pesan text not null,
  dibaca boolean not null default false,
  created_at timestamptz not null default now()
);

create index pm_notifications_user_id_idx on pm_notifications (user_id);
create index pm_notifications_user_id_dibaca_idx on pm_notifications (user_id, dibaca);

alter table pm_notifications enable row level security;

create policy pm_baca_notifikasi_sendiri
  on pm_notifications for select
  using (user_id = auth.uid());

-- Notifikasi dibuat oleh AKTOR (mis. yang mengomentari) untuk PENERIMA lain
-- (mis. assignee) - jadi tidak bisa dibatasi user_id = auth.uid() seperti
-- select/update. Dibatasi lewat pm_can_access_task(): aktor harus punya akses
-- ke Task yang jadi konteks notifikasi.
create policy pm_buat_notifikasi_anggota_task
  on pm_notifications for insert
  with check (task_id is null or pm_can_access_task(task_id));

create policy pm_tandai_dibaca_notifikasi_sendiri
  on pm_notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy pm_hapus_notifikasi_sendiri
  on pm_notifications for delete
  using (user_id = auth.uid());
