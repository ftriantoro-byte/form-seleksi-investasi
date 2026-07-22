-- Susulan permintaan user: Task bisa diberi warna & tag. "color" pakai
-- nama warna tetap dari palet kecil (bukan hex bebas) - konsisten dengan
-- pola TASK_STATUS_BADGE_KELAS/TASK_PRIORITY_BADGE_KELAS yang sudah ada
-- (kelas Tailwind tetap per nilai, bukan CSS custom per baris), sekaligus
-- menghindari perlu color-picker & validasi hex di form. "tags" teks bebas
-- (bisa lebih dari satu per Task), bukan tabel Label/Tag terpisah - user
-- pilih model sederhana "warna Task + tag teks", bukan sistem Label
-- reusable ber-warna sendiri.
alter table pm_tasks add column color text;
alter table pm_tasks add column tags text[] not null default '{}';
