-- Modul PM tahap A.3: fungsi RPC untuk menampilkan email anggota.
--
-- Aplikasi ini sengaja tidak query auth.users langsung dari client (tidak
-- bisa - anon/authenticated role tidak ada akses ke schema auth). Modul form
-- menghindari ini dengan menyimpan full_name manual di user_roles. Untuk
-- modul PM dipilih pendekatan berbeda: fungsi SECURITY DEFINER yang join ke
-- auth.users lalu mengembalikan hanya email - dimiliki oleh role migrasi
-- (postgres) yang punya akses ke schema auth, jadi tidak butuh admin mengisi
-- nama manual tiap kali menambah anggota. Setiap fungsi mengecek sendiri
-- pemanggilnya berhak (pm_is_member() / pm_can_access_workspace()) sebelum
-- membocorkan email siapapun.

create or replace function public.pm_member_profiles()
returns table (user_id uuid, email text, role pm_role)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not pm_is_member() then
    raise exception 'Akses ditolak: Anda bukan anggota modul Manajemen Proyek.';
  end if;

  return query
    select m.user_id, u.email::text, m.role
    from pm_members m
    join auth.users u on u.id = m.user_id
    order by u.email;
end;
$$;

create or replace function public.pm_workspace_member_profiles(p_workspace_id uuid)
returns table (user_id uuid, email text)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not pm_can_access_workspace(p_workspace_id) then
    raise exception 'Akses ditolak: Anda bukan anggota Workspace ini.';
  end if;

  return query
    select wm.user_id, u.email::text
    from pm_workspace_members wm
    join auth.users u on u.id = wm.user_id
    where wm.workspace_id = p_workspace_id
    order by u.email;
end;
$$;
