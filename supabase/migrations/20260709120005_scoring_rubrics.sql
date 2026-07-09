-- Tahap 3.2: tabel rubrik skoring (referensi skor 1/3/5 per kriteria C1-C8),
-- data terstruktur supaya bisa diedit admin tanpa ubah kode (lihat PANDUAN.md
-- Prompt 3.2). Satu baris per (kriteria_kode, skor_level).

create table scoring_rubrics (
  id uuid primary key default gen_random_uuid(),
  kriteria_kode text not null,
  skor_level smallint not null check (skor_level in (1, 3, 5)),
  deskripsi text not null,
  validasi_minimum text not null,
  unique (kriteria_kode, skor_level)
);

alter table scoring_rubrics enable row level security;

create policy "user login baca scoring_rubrics"
  on scoring_rubrics for select
  using (auth.role() = 'authenticated');

create policy "admin kelola scoring_rubrics"
  on scoring_rubrics for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');
