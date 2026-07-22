-- Time-boxing: jadwalkan Task ke jam tertentu dalam 1 hari (permintaan
-- user, metode time-boxing - "jadwal harian, memasukkan task ke hari yang
-- ditentukan"). `due_date` (kolom yg sudah ada) TETAP dipakai sbg "hari"-nya
-- - 2 kolom baru ini cuma nambah "jam berapa" & "berapa lama" dalam hari
-- itu. Sengaja TIDAK bikin tabel time_blocks terpisah (1 Task = 1 blok
-- waktu, bukan multi-sesi per Task) - keputusan user, cukup utk
-- time-boxing harian biasa tanpa kompleksitas relasi baru.

alter table pm_tasks add column scheduled_time time;
alter table pm_tasks add column scheduled_duration_minutes integer;
