-- Tahap 0.2: Row Level Security. Lihat ARCHITECTURE.md §3 untuk ringkasan aturan per role.

alter table user_roles enable row level security;
alter table forms enable row level security;
alter table submissions enable row level security;
alter table approval_chain enable row level security;
alter table submission_history enable row level security;

-- ── user_roles ───────────────────────────────────────────────────────────

-- Nama & role perlu terlihat oleh siapapun yang login untuk menampilkan
-- "disetujui oleh: <nama> (<tingkat>)" di halaman detail, dashboard, dan PDF
-- (tahap 5.1). Ini menggantikan kebutuhan policy "baca role sendiri" yang
-- lebih sempit - internal app, nama+role bukan data sensitif antar pegawai.
create policy "user login baca semua nama & role"
  on user_roles for select
  using (auth.role() = 'authenticated');

create policy "admin kelola role"
  on user_roles for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ── forms ────────────────────────────────────────────────────────────────

create policy "user login baca forms"
  on forms for select
  using (auth.role() = 'authenticated');

create policy "admin kelola forms"
  on forms for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ── submissions ──────────────────────────────────────────────────────────

create policy "evaluator lihat submission sendiri"
  on submissions for select
  using (dibuat_oleh = auth.uid());

create policy "evaluator buat submission sendiri"
  on submissions for insert
  with check (dibuat_oleh = auth.uid());

create policy "evaluator update submission sendiri"
  on submissions for update
  using (dibuat_oleh = auth.uid())
  with check (dibuat_oleh = auth.uid());

create policy "manajer lihat submission relevan"
  on submissions for select
  using (
    current_user_role() = 'manajer'
    and (
      status = 'menunggu_manajer'
      or exists (
        select 1 from approval_chain ac
        where ac.submission_id = submissions.id
          and ac.tingkat = 'manajer'
          and ac.approver_user_id = auth.uid()
      )
    )
  );

create policy "manajer putuskan submission menunggu_manajer"
  on submissions for update
  using (current_user_role() = 'manajer' and status = 'menunggu_manajer')
  with check (true);

create policy "vp lihat submission relevan"
  on submissions for select
  using (
    current_user_role() = 'vp'
    and (
      status = 'menunggu_vp'
      or exists (
        select 1 from approval_chain ac
        where ac.submission_id = submissions.id
          and ac.tingkat = 'vp'
          and ac.approver_user_id = auth.uid()
      )
    )
  );

create policy "vp putuskan submission menunggu_vp"
  on submissions for update
  using (current_user_role() = 'vp' and status = 'menunggu_vp')
  with check (true);

create policy "direksi lihat submission relevan"
  on submissions for select
  using (
    current_user_role() = 'direksi'
    and (
      status = 'menunggu_direksi'
      or exists (
        select 1 from approval_chain ac
        where ac.submission_id = submissions.id
          and ac.tingkat = 'direksi'
          and ac.approver_user_id = auth.uid()
      )
    )
  );

create policy "direksi putuskan submission menunggu_direksi"
  on submissions for update
  using (current_user_role() = 'direksi' and status = 'menunggu_direksi')
  with check (true);

create policy "admin lihat semua submission"
  on submissions for select
  using (current_user_role() = 'admin');

create policy "admin update semua submission"
  on submissions for update
  using (current_user_role() = 'admin')
  with check (true);

-- ── approval_chain ───────────────────────────────────────────────────────
-- Baca mengikuti akses ke submissions terkait: subquery ke tabel submissions
-- otomatis tunduk pada RLS submissions milik pemanggil yang sama.

create policy "baca approval_chain ikut akses submission"
  on approval_chain for select
  using (
    exists (select 1 from submissions s where s.id = approval_chain.submission_id)
  );

create policy "approver update baris tingkatnya sendiri"
  on approval_chain for update
  using (
    (tingkat = 'manajer' and current_user_role() = 'manajer' and status = 'menunggu')
    or (tingkat = 'vp' and current_user_role() = 'vp' and status = 'menunggu')
    or (tingkat = 'direksi' and current_user_role() = 'direksi' and status = 'menunggu')
  )
  with check (true);

-- Evaluator butuh update baris yang sudah "ditolak" untuk set
-- diteruskan_meski_ditolak=true saat memilih "tetap teruskan" (lihat
-- actions/approval.ts putuskanLanjutan). Server Action yang membatasi kolom
-- mana yang benar-benar diubah; RLS di sini hanya membatasi baris & submission.
create policy "evaluator teruskan baris ditolak milik submission sendiri"
  on approval_chain for update
  using (
    status = 'ditolak'
    and exists (
      select 1 from submissions s
      where s.id = approval_chain.submission_id and s.dibuat_oleh = auth.uid()
    )
  )
  with check (true);

-- Insert baris approval_chain normalnya dilakukan otomatis oleh trigger
-- buat_approval_chain_awal (SECURITY DEFINER, bypass RLS). Policy ini hanya
-- jaga-jaga untuk jalur insert langsung oleh evaluator pemilik submission.
create policy "evaluator insert approval_chain submission sendiri"
  on approval_chain for insert
  with check (
    exists (
      select 1 from submissions s
      where s.id = submission_id and s.dibuat_oleh = auth.uid()
    )
  );

-- ── submission_history ───────────────────────────────────────────────────
-- Append-only: sengaja TIDAK ada policy update/delete sama sekali (termasuk
-- untuk admin) — form ini adalah dokumen tata kelola yang wajib bisa diaudit
-- (lihat CATATAN PENTING di PANDUAN.md). Tanpa policy, RLS default menolak
-- perintah tersebut untuk semua role.

create policy "baca history ikut akses submission"
  on submission_history for select
  using (
    exists (select 1 from submissions s where s.id = submission_history.submission_id)
  );

create policy "insert history oleh pelaku aksi"
  on submission_history for insert
  with check (diubah_oleh = auth.uid());
