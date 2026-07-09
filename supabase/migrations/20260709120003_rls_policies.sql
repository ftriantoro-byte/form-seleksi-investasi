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
create policy user_login_baca_semua_nama_dan_role
  on user_roles for select
  using (auth.role() = 'authenticated');

create policy admin_kelola_role
  on user_roles for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ── forms ────────────────────────────────────────────────────────────────

create policy user_login_baca_forms
  on forms for select
  using (auth.role() = 'authenticated');

create policy admin_kelola_forms
  on forms for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ── submissions ──────────────────────────────────────────────────────────

create policy evaluator_lihat_submission_sendiri
  on submissions for select
  using (dibuat_oleh = auth.uid());

create policy evaluator_buat_submission_sendiri
  on submissions for insert
  with check (dibuat_oleh = auth.uid());

create policy evaluator_update_submission_sendiri
  on submissions for update
  using (dibuat_oleh = auth.uid())
  with check (dibuat_oleh = auth.uid());

create policy manajer_lihat_submission_relevan
  on submissions for select
  using (
    current_user_role() = 'manajer'
    and (status = 'menunggu_manajer' or is_approver_of(id, 'manajer'))
  );

create policy manajer_putuskan_submission_menunggu_manajer
  on submissions for update
  using (current_user_role() = 'manajer' and status = 'menunggu_manajer')
  with check (true);

create policy vp_lihat_submission_relevan
  on submissions for select
  using (
    current_user_role() = 'vp'
    and (status = 'menunggu_vp' or is_approver_of(id, 'vp'))
  );

create policy vp_putuskan_submission_menunggu_vp
  on submissions for update
  using (current_user_role() = 'vp' and status = 'menunggu_vp')
  with check (true);

create policy direksi_lihat_submission_relevan
  on submissions for select
  using (
    current_user_role() = 'direksi'
    and (status = 'menunggu_direksi' or is_approver_of(id, 'direksi'))
  );

create policy direksi_putuskan_submission_menunggu_direksi
  on submissions for update
  using (current_user_role() = 'direksi' and status = 'menunggu_direksi')
  with check (true);

create policy admin_lihat_semua_submission
  on submissions for select
  using (current_user_role() = 'admin');

create policy admin_update_semua_submission
  on submissions for update
  using (current_user_role() = 'admin')
  with check (true);

-- ── approval_chain ───────────────────────────────────────────────────────
-- Baca mengikuti akses ke submissions terkait, lewat helper can_access_submission()
-- (BUKAN subquery langsung ke submissions) - submissions punya kebijakan yang
-- subquery balik ke approval_chain (manajer/vp/direksi_lihat_submission_relevan),
-- jadi subquery langsung dua arah di sini bikin Postgres menolak dengan
-- "infinite recursion detected in policy". Helper SECURITY DEFINER memutus siklusnya.

create policy baca_approval_chain_ikut_akses_submission
  on approval_chain for select
  using (can_access_submission(submission_id));

create policy approver_update_baris_tingkatnya_sendiri
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
create policy evaluator_teruskan_baris_ditolak_milik_submission_sendiri
  on approval_chain for update
  using (status = 'ditolak' and is_submission_owner(submission_id))
  with check (true);

-- Insert baris approval_chain normalnya dilakukan otomatis oleh trigger
-- buat_approval_chain_awal (SECURITY DEFINER, bypass RLS). Policy ini hanya
-- jaga-jaga untuk jalur insert langsung oleh evaluator pemilik submission.
create policy evaluator_insert_approval_chain_submission_sendiri
  on approval_chain for insert
  with check (is_submission_owner(submission_id));

-- ── submission_history ───────────────────────────────────────────────────
-- Append-only: sengaja TIDAK ada policy update/delete sama sekali (termasuk
-- untuk admin) — form ini adalah dokumen tata kelola yang wajib bisa diaudit
-- (lihat CATATAN PENTING di PANDUAN.md). Tanpa policy, RLS default menolak
-- perintah tersebut untuk semua role.

create policy baca_history_ikut_akses_submission
  on submission_history for select
  using (
    exists (select 1 from submissions s where s.id = submission_history.submission_id)
  );

create policy insert_history_oleh_pelaku_aksi
  on submission_history for insert
  with check (diubah_oleh = auth.uid());
