-- Form kedua (Quick Screen Proyek) butuh alur approval 2 tingkat (Manajer -> VP),
-- bukan 3 tingkat (Manajer -> VP -> Direksi) seperti Seleksi Investasi. Generalisasi
-- trigger buat_approval_chain_awal() supaya jumlah baris approval_chain yang dibuat
-- mengikuti kolom baru forms.tingkat_approval_maksimal, bukan selalu hardcode 3 baris.
--
-- Default 'direksi' membuat baris Seleksi Investasi yang sudah ada otomatis dapat
-- nilai itu - perilaku form tersebut TIDAK berubah (tetap dapat 3 baris approval_chain
-- persis seperti sebelumnya).

alter table forms
  add column tingkat_approval_maksimal approval_tingkat not null default 'direksi';

create or replace function public.buat_approval_chain_awal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  status_lama submission_status;
  v_maksimal approval_tingkat;
begin
  if tg_op = 'UPDATE' then
    status_lama := old.status;
  else
    status_lama := null;
  end if;

  if new.status = 'menunggu_manajer' and status_lama is distinct from 'menunggu_manajer' then
    select tingkat_approval_maksimal into v_maksimal from forms where id = new.form_id;

    insert into approval_chain (submission_id, tingkat, status)
    values (new.id, 'manajer', 'menunggu')
    on conflict (submission_id, tingkat) do nothing;

    if v_maksimal in ('vp', 'direksi') then
      insert into approval_chain (submission_id, tingkat, status)
      values (new.id, 'vp', 'menunggu')
      on conflict (submission_id, tingkat) do nothing;
    end if;

    if v_maksimal = 'direksi' then
      insert into approval_chain (submission_id, tingkat, status)
      values (new.id, 'direksi', 'menunggu')
      on conflict (submission_id, tingkat) do nothing;
    end if;
  end if;
  return new;
end;
$$;
