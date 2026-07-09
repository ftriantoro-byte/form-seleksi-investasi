-- Tahap 0.2: fungsi helper & trigger otomatis.

-- Helper role user saat ini, dipakai berulang kali di RLS policy (migration berikutnya).
-- SECURITY DEFINER: dijalankan sebagai pemilik fungsi (bukan pemanggil), supaya lookup
-- ke user_roles tidak ikut terblokir oleh RLS tabel user_roles itu sendiri.
create or replace function public.current_user_role()
returns app_role
language sql
security definer
stable
set search_path = public
as $$
  select role from user_roles where user_id = auth.uid();
$$;

-- Auto-update kolom diupdate_pada setiap submissions baris diubah.
create or replace function public.set_diupdate_pada()
returns trigger
language plpgsql
as $$
begin
  new.diupdate_pada = now();
  return new;
end;
$$;

create trigger trg_submissions_diupdate_pada
  before update on submissions
  for each row
  execute function public.set_diupdate_pada();

-- Begitu submission masuk status menunggu_manajer (lulus gate + skoring + submit Bagian D),
-- otomatis buat 3 baris approval_chain (manajer/vp/direksi, semua "menunggu") sebagai
-- kerangka alur approval bertingkat. SECURITY DEFINER supaya insert ini tidak terhalang
-- RLS approval_chain (evaluator yang men-submit tidak perlu policy INSERT langsung).
create or replace function public.buat_approval_chain_awal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  status_lama submission_status;
begin
  -- Postgres tidak menjamin short-circuit evaluation pada OR, jadi OLD tidak
  -- boleh dirujuk langsung dalam kondisi campuran INSERT/UPDATE (OLD belum
  -- ter-assign saat TG_OP = 'INSERT'). Ambil dulu ke variabel lewat IF/ELSE.
  if tg_op = 'UPDATE' then
    status_lama := old.status;
  else
    status_lama := null;
  end if;

  if new.status = 'menunggu_manajer' and status_lama is distinct from 'menunggu_manajer' then
    insert into approval_chain (submission_id, tingkat, status)
    values
      (new.id, 'manajer', 'menunggu'),
      (new.id, 'vp', 'menunggu'),
      (new.id, 'direksi', 'menunggu')
    on conflict (submission_id, tingkat) do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_buat_approval_chain_awal
  after insert or update on submissions
  for each row
  execute function public.buat_approval_chain_awal();

-- ── Helper untuk RLS lintas-tabel (submissions <-> approval_chain) ─────────
-- Kalau kebijakan RLS di submissions subquery approval_chain SECARA LANGSUNG,
-- dan kebijakan RLS di approval_chain subquery submissions SECARA LANGSUNG,
-- Postgres mendeteksi siklus itu dan menolak dengan "infinite recursion
-- detected in policy" - terlepas dari data/user yang sedang query. Helper
-- SECURITY DEFINER berikut memutus siklusnya (query internal di dalam fungsi
-- bypass RLS, jadi tidak ada pengecekan RLS berulang lintas tabel).

create or replace function public.is_approver_of(p_submission_id uuid, p_tingkat approval_tingkat)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from approval_chain
    where submission_id = p_submission_id
      and tingkat = p_tingkat
      and approver_user_id = auth.uid()
  );
$$;

create or replace function public.is_submission_owner(p_submission_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from submissions
    where id = p_submission_id and dibuat_oleh = auth.uid()
  );
$$;

create or replace function public.can_access_submission(p_submission_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from submissions s
    where s.id = p_submission_id
      and (
        s.dibuat_oleh = auth.uid()
        or current_user_role() = 'admin'
        or (current_user_role() = 'manajer' and (s.status = 'menunggu_manajer' or is_approver_of(s.id, 'manajer')))
        or (current_user_role() = 'vp' and (s.status = 'menunggu_vp' or is_approver_of(s.id, 'vp')))
        or (current_user_role() = 'direksi' and (s.status = 'menunggu_direksi' or is_approver_of(s.id, 'direksi')))
      )
  );
$$;
