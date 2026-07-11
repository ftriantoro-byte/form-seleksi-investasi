-- Modul PM tahap B.5: Docs kolaboratif tertaut ke Task, sinkron real-time
-- pakai Yjs (CRDT) - lihat PM-MODULE-SPEC.md §5. Satu Task maksimal satu
-- Doc (dibuat otomatis/lazy saat pertama kali dibuka, lihat
-- lib/pm/docs.ts). crdt_state menyimpan snapshot state Yjs terakhir
-- (Y.encodeStateAsUpdate), disimpan berkala oleh client (debounce ~1.5 detik)
-- - lihat components/pm/PmCollaborativeDoc.tsx. Sinkronisasi LIVE antar
-- client memakai Supabase Realtime Broadcast (channel per Doc), BUKAN lewat
-- kolom ini - kolom ini cuma persistensi supaya Doc tidak hilang saat semua
-- orang keluar.

create table pm_docs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references pm_tasks (id) on delete cascade,
  crdt_state bytea,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_pm_docs_updated_at
  before update on pm_docs
  for each row
  execute function public.pm_set_updated_at();

alter table pm_docs enable row level security;

create policy pm_akses_doc_anggota_task
  on pm_docs for all
  using (pm_can_access_task(task_id))
  with check (pm_can_access_task(task_id));

-- TIDAK didaftarkan ke publication supabase_realtime - sinkron live antar
-- client pakai Broadcast (channel.send), bukan Postgres Changes, jadi tabel
-- ini tidak perlu ada di publication (beda dengan pm_tasks/pm_comments/
-- pm_checklist_items di tahap B.3).
