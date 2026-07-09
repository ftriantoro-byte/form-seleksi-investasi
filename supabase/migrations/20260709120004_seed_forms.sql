-- Tahap 0.2: seed data awal tabel forms (form pertama untuk landing page tahap 0.4).

insert into forms (slug, nama, deskripsi, aktif)
values (
  'seleksi-investasi',
  'Seleksi Awal Proposal Investasi',
  'Seleksi awal proposal investasi: kriteria gugur, skoring berbobot, dan approval bertingkat (Manajer → VP → Direksi).',
  true
)
on conflict (slug) do nothing;
