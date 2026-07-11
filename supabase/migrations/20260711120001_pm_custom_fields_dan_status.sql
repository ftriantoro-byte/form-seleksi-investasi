-- Modul PM tahap B.6: Custom Fields (per List, nilai per Task) & Custom
-- Status per List.
--
-- CATATAN CAKUPAN (lihat PROGRESS.md B.6 untuk detail): "custom status per
-- List" di sini berarti List boleh mengganti LABEL TAMPILAN untuk 4 status
-- baku (to_do/in_progress/in_review/done), BUKAN mendefinisikan set status
-- arbitrer baru. Kolom pm_tasks.status TETAP enum pm_task_status yang sama
-- seperti sejak tahap A.4 - Board/Calendar/Gantt/filter yang sudah teruji
-- tidak perlu dirombak, cuma teks yang ditampilkan yang bisa disesuaikan.
-- Full custom status arbitrer (jumlah kolom bebas, seperti ClickUp asli)
-- akan jadi perubahan arsitektur besar (ubah status dari enum ke referensi
-- tabel) - sengaja ditunda sampai benar-benar dibutuhkan.

create type pm_custom_field_type as enum ('text', 'number', 'date', 'checkbox', 'select');

create table pm_custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references pm_lists (id) on delete cascade,
  nama text not null,
  type pm_custom_field_type not null,
  opsi jsonb, -- array string, dipakai kalau type = 'select'
  urutan integer not null default 0,
  created_at timestamptz not null default now()
);

create index pm_custom_field_definitions_list_id_idx on pm_custom_field_definitions (list_id);

create table pm_custom_field_values (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references pm_tasks (id) on delete cascade,
  field_definition_id uuid not null references pm_custom_field_definitions (id) on delete cascade,
  value text,
  unique (task_id, field_definition_id)
);

create index pm_custom_field_values_task_id_idx on pm_custom_field_values (task_id);

alter table pm_custom_field_definitions enable row level security;
alter table pm_custom_field_values enable row level security;

create policy pm_akses_field_definition_anggota_list
  on pm_custom_field_definitions for all
  using (pm_can_access_list(list_id))
  with check (pm_can_access_list(list_id));

create policy pm_akses_field_value_anggota_task
  on pm_custom_field_values for all
  using (pm_can_access_task(task_id))
  with check (pm_can_access_task(task_id));

alter table pm_lists add column custom_status_labels jsonb;
