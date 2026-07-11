-- Modul PM tahap C.5: Time tracking manual (catat menit kerja per Task).
--
-- CATATAN CAKUPAN: manual saja (user mengetik sendiri jumlah menit setelah
-- kerja, BUKAN timer start/stop otomatis) sesuai PM-MODULE-SPEC.md §3 C.5
-- "catat menit". user_id SELALU diri sendiri (bukan bisa pilih orang lain -
-- dipaksa dari sisi Server Action lewat auth.getUser(), bukan input form)
-- supaya catatan waktu kerja tetap representasi jujur siapa yang kerja.
-- Hapus entri DIBATASI ke pembuatnya sendiri saja (pola sama dengan Komentar
-- B.4/A.4 - bukan pola bebas seperti Checklist) supaya orang lain tidak bisa
-- menghapus/mengubah jejak waktu kerja anggota lain.

create table pm_time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references pm_tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  menit integer not null check (menit > 0),
  catatan text,
  tanggal date not null default current_date,
  created_at timestamptz not null default now()
);

create index pm_time_entries_task_id_idx on pm_time_entries (task_id);

alter table pm_time_entries enable row level security;

create policy pm_akses_time_entry_anggota_task
  on pm_time_entries for select
  using (pm_can_access_task(task_id));

create policy pm_akses_time_entry_insert_anggota_task
  on pm_time_entries for insert
  with check (pm_can_access_task(task_id) and user_id = auth.uid());

create policy pm_akses_time_entry_delete_pembuat_sendiri
  on pm_time_entries for delete
  using (user_id = auth.uid());
