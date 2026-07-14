-- Modul baru: Laporan Executive Summary (bulanan, historis) - berdiri
-- sendiri di luar modul PM maupun form seleksi investasi (permintaan user).
-- Isi laporan (kompetitif/keuangan/portofolio/capex/isu/mitra/rekomendasi)
-- disimpan sebagai SATU kolom jsonb, pola sama seperti `submissions.data`
-- di 20260709120001_enums_dan_tabel.sql - strukturnya sangat bersarang
-- (array di dalam array) & tidak pernah butuh query SQL ke dalam
-- baris-barisnya secara individual, jadi normalisasi relasional cuma
-- menambah kompleksitas migrasi/RLS/CRUD tanpa manfaat nyata. Lihat
-- lib/exsum/types.ts untuk bentuk persis isi kolom `data`.

create table exsum_reports (
  id uuid primary key default gen_random_uuid(),
  perusahaan text not null,
  kode text not null,
  periode text not null,
  no_dok text not null,
  status text not null default 'Draft' check (status in ('Draft', 'Final')),
  data jsonb not null default '{}'::jsonb,
  dibuat_oleh uuid not null references auth.users (id),
  dibuat_pada timestamptz not null default now(),
  diupdate_pada timestamptz not null default now()
);

create index exsum_reports_dibuat_pada_idx on exsum_reports (dibuat_pada desc);

-- Reuse trigger function generik dari 20260709120002_fungsi_dan_trigger.sql
-- (dipakai jg oleh submissions) - butuh kolom bernama diupdate_pada persis.
create trigger trg_exsum_reports_diupdate_pada
  before update on exsum_reports
  for each row
  execute function public.set_diupdate_pada();

alter table exsum_reports enable row level security;

-- Laporan Direksi/Dewan Komisaris ini ditujukan dibaca luas oleh pegawai yang
-- login (bukan data pribadi/sensitif per-user) - pola sama dgn
-- user_login_baca_semua_nama_dan_role (20260709120003). Tulis (buat/ubah/
-- hapus) dibatasi role admin saja, pola sama dgn admin_kelola_forms.
create policy user_login_baca_exsum_reports
  on exsum_reports for select
  using (auth.role() = 'authenticated');

create policy admin_kelola_exsum_reports
  on exsum_reports for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');
