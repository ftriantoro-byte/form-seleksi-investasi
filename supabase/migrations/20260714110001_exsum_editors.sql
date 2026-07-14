-- Susulan setelah 20260714100001_exsum_reports.sql: akses tulis Executive
-- Summary TERNYATA bukan admin-only (app_role admin dipakai luas utk approval
-- form seleksi investasi - user tidak mau 3 orang ini otomatis dapat akses
-- admin ke SELURUH sistem approval cuma supaya bisa edit Exsum). Whitelist
-- terpisah dibuat, pola identik pm_members (modul PM) - baris ADA utk
-- seorang user = boleh tulis (buat/ubah/hapus/duplikat) laporan Exsum.
-- Anggota baru ditambah manual lewat SQL Editor (INSERT ke tabel ini),
-- bukan lewat UI - sama seperti cara pm_members ditambah selama ini.

create table exsum_editors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table exsum_editors enable row level security;

-- Siapapun yang login boleh tahu siapa saja editor Exsum (dipakai Server
-- Component utk cek "apakah SAYA editor" - bukan data sensitif).
create policy user_login_baca_exsum_editors
  on exsum_editors for select
  using (auth.role() = 'authenticated');

-- Tidak ada policy insert/update/delete sama sekali - RLS default menolak
-- semua perubahan lewat API utk siapapun termasuk admin, harus lewat SQL
-- Editor langsung (konsisten dgn cara pm_members dikelola).

-- Ganti policy tulis exsum_reports dari admin-only ke whitelist exsum_editors.
drop policy admin_kelola_exsum_reports on exsum_reports;

create policy exsum_editor_kelola_exsum_reports
  on exsum_reports for all
  using (exists (select 1 from exsum_editors e where e.user_id = auth.uid()))
  with check (exists (select 1 from exsum_editors e where e.user_id = auth.uid()));

-- Seed 3 editor awal sesuai permintaan user - user yang belum pernah login
-- ke aplikasi ini (belum ada baris auth.users) otomatis terlewati (subquery
-- kosong), tidak menyebabkan error.
insert into exsum_editors (user_id)
select id from auth.users
where email in ('fajar@wikagedung.id', 'alexander.b@wgmail.id', 'windi.s@wgmail.id')
on conflict (user_id) do nothing;
