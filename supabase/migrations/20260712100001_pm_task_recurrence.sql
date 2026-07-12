-- Modul PM: Task berulang (recurring) - mingguan, bulanan, atau periode
-- tertentu (custom, dalam hari).
--
-- CATATAN CAKUPAN: recurrence me-reset TASK YANG SAMA (bukan membuat Task
-- baru tiap siklus) - saat Task berulang ditandai "Done", Server Action
-- menghitung tanggal berikutnya dari due_date lalu mengembalikan status ke
-- "to_do" dan menggeser due_date/start_date maju. Ini konsisten dengan
-- perilaku recurring task ClickUp asli, dan menghindari Checklist/Komentar/
-- Lampiran/Waktu Kerja terpecah jadi baris baru tiap siklus (yang akan
-- terjadi kalau kita membuat Task baru tiap kali).

create type pm_recurrence_type as enum ('weekly', 'monthly', 'custom');

alter table pm_tasks add column recurrence_type pm_recurrence_type;
alter table pm_tasks add column recurrence_interval integer not null default 1;
alter table pm_tasks add column recurrence_end_date date;
