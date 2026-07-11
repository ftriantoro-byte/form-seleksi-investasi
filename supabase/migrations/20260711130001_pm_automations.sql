-- Modul PM tahap C.1: Automasi sederhana (Trigger-Condition-Action) per List.
--
-- CATATAN CAKUPAN: hanya 1 jenis Trigger ("saat status Task berubah jadi X"),
-- 1 jenis Condition opsional ("priority Task = Y", kosong berarti tanpa
-- syarat tambahan), dan 3 jenis Action (ubah status/assignee/priority) -
-- bukan automation builder bebas seperti ClickUp asli. Dijalankan SATU KALI
-- per perubahan status yang dipicu user (lewat updateTask/updateTaskStatus),
-- TIDAK rekursif memicu automation lain dari hasil action-nya sendiri -
-- sengaja dibatasi begitu supaya tidak ada risiko infinite loop antar
-- automation yang saling memicu.

create table pm_automations (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references pm_lists (id) on delete cascade,
  nama text not null,
  trigger_status pm_task_status not null,
  condition_priority pm_task_priority,
  action_type text not null check (action_type in ('set_status', 'set_assignee', 'set_priority')),
  action_value text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create index pm_automations_list_id_idx on pm_automations (list_id);

alter table pm_automations enable row level security;

create policy pm_akses_automation_anggota_list
  on pm_automations for all
  using (pm_can_access_list(list_id))
  with check (pm_can_access_list(list_id));
