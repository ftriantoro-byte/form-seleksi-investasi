-- Fix: "infinite recursion detected in policy for relation submissions" -
-- ditemukan saat testing end-to-end sungguhan (tahap 5.2). submissions'
-- manajer/vp/direksi_lihat_submission_relevan SELECT policies subquery
-- approval_chain langsung, dan approval_chain punya SELECT policy yang
-- subquery submissions langsung balik - siklus dua arah yang Postgres
-- tolak untuk di-plan, terlepas dari role/data yang sedang query.
--
-- Patch ini untuk project Supabase yang migration 0001-0006-nya SUDAH
-- dijalankan (siklusnya sudah terlanjur ada). Untuk deployment baru dari
-- awal, migration 0002 dan 0003 sudah diperbaiki langsung (helper function
-- ini + kebijakan yang memakainya) - migration ini jadi redundant-tapi-aman
-- (create or replace + drop/create policy, tidak mengubah apapun kalau
-- dijalankan setelah versi 0002/0003 yang sudah benar).

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

drop policy if exists manajer_lihat_submission_relevan on submissions;
create policy manajer_lihat_submission_relevan
  on submissions for select
  using (
    current_user_role() = 'manajer'
    and (status = 'menunggu_manajer' or is_approver_of(id, 'manajer'))
  );

drop policy if exists vp_lihat_submission_relevan on submissions;
create policy vp_lihat_submission_relevan
  on submissions for select
  using (
    current_user_role() = 'vp'
    and (status = 'menunggu_vp' or is_approver_of(id, 'vp'))
  );

drop policy if exists direksi_lihat_submission_relevan on submissions;
create policy direksi_lihat_submission_relevan
  on submissions for select
  using (
    current_user_role() = 'direksi'
    and (status = 'menunggu_direksi' or is_approver_of(id, 'direksi'))
  );

drop policy if exists baca_approval_chain_ikut_akses_submission on approval_chain;
create policy baca_approval_chain_ikut_akses_submission
  on approval_chain for select
  using (can_access_submission(submission_id));

drop policy if exists evaluator_teruskan_baris_ditolak_milik_submission_sendiri on approval_chain;
create policy evaluator_teruskan_baris_ditolak_milik_submission_sendiri
  on approval_chain for update
  using (status = 'ditolak' and is_submission_owner(submission_id))
  with check (true);

drop policy if exists evaluator_insert_approval_chain_submission_sendiri on approval_chain;
create policy evaluator_insert_approval_chain_submission_sendiri
  on approval_chain for insert
  with check (is_submission_owner(submission_id));
