-- Seed row forms untuk form kedua: Quick Screen Proyek.
-- tingkat_approval_maksimal = 'vp' -> trigger buat_approval_chain_awal() (lihat migration
-- sebelumnya) hanya membuat 2 baris approval_chain (manajer, vp), bukan 3.

insert into forms (slug, nama, deskripsi, aktif, tingkat_approval_maksimal)
values (
  'quick-screen-proyek',
  'Quick Screen Proyek',
  'Screening cepat awal terhadap peluang/informasi proyek berdasarkan penilaian 4 dimensi (Pasar, Teknis, Legal, Skema & Finansial), sebelum masuk proses seleksi investasi formal.',
  true,
  'vp'
)
on conflict (slug) do nothing;
