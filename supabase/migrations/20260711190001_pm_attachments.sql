-- Modul PM tahap C.6: File attachment per Task via Supabase Storage.
--
-- Bucket PRIVATE (bukan public) - konsisten dengan semangat akses terbatas
-- modul PM (±3 orang). Path penyimpanan pakai konvensi `{taskId}/{uuid}-
-- {namaFile}` supaya RLS storage.objects bisa mengecek akses Task lewat
-- segmen folder pertama (storage.foldername(name)[1]) tanpa perlu tabel
-- mapping tambahan. Unduh lewat signed URL berumur pendek (dibuat on-demand
-- di Server Action), BUKAN getPublicUrl - file tidak pernah bisa diakses
-- langsung tanpa lewat otorisasi PM.

insert into storage.buckets (id, name, public)
values ('pm-attachments', 'pm-attachments', false)
on conflict (id) do nothing;

create policy pm_attachments_storage_select
  on storage.objects for select
  using (
    bucket_id = 'pm-attachments'
    and pm_can_access_task(((storage.foldername(name))[1])::uuid)
  );

create policy pm_attachments_storage_insert
  on storage.objects for insert
  with check (
    bucket_id = 'pm-attachments'
    and pm_can_access_task(((storage.foldername(name))[1])::uuid)
  );

create policy pm_attachments_storage_delete
  on storage.objects for delete
  using (
    bucket_id = 'pm-attachments'
    and pm_can_access_task(((storage.foldername(name))[1])::uuid)
  );

-- Metadata terpisah dari storage.objects supaya gampang di-query/di-join
-- (nama file asli, ukuran, siapa yang upload) tanpa parsing path/metadata
-- storage tiap kali.
create table pm_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references pm_tasks (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  size_bytes bigint not null,
  content_type text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index pm_attachments_task_id_idx on pm_attachments (task_id);

alter table pm_attachments enable row level security;

create policy pm_akses_attachment_anggota_task
  on pm_attachments for all
  using (pm_can_access_task(task_id))
  with check (pm_can_access_task(task_id));
