-- Modul PM tahap C.4: Notulensi Meeting.
--
-- Meniru 2 pola yang sudah ada (PM-MODULE-SPEC.md §4) supaya konsisten,
-- bukan bikin pola baru: (1) isi notulensi pakai editor kolaboratif real-time
-- YANG SAMA dengan Docs (B.5) - crdt_state bytea langsung di baris
-- pm_meetings (bukan tabel pm_docs terpisah, beda dengan Docs yang 1:1 per
-- Task), (2) Action item dikonversi jadi Task satu klik - pola identik
-- "konversi sticky note jadi Task" (C.3), task_id diisi begitu dikonversi
-- (bukan dihapus dari daftar action item).
--
-- CATATAN CAKUPAN: peserta (attendee) ditentukan SEKALI saat meeting dibuat,
-- belum ada UI ubah peserta setelahnya (bisa ditambah kalau ternyata
-- dibutuhkan - untuk ~3 orang dampaknya kecil).

create table pm_meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references pm_workspaces (id) on delete cascade,
  space_id uuid references pm_spaces (id) on delete set null,
  judul text not null,
  meeting_date date,
  crdt_state bytea,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pm_meetings_workspace_id_idx on pm_meetings (workspace_id);

create trigger trg_pm_meetings_updated_at
  before update on pm_meetings
  for each row
  execute function public.pm_set_updated_at();

create table pm_meeting_attendees (
  meeting_id uuid not null references pm_meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  primary key (meeting_id, user_id)
);

create table pm_meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references pm_meetings (id) on delete cascade,
  deskripsi text not null,
  assignee_id uuid references auth.users (id),
  due_date date,
  task_id uuid references pm_tasks (id) on delete set null,
  created_at timestamptz not null default now()
);

create index pm_meeting_action_items_meeting_id_idx on pm_meeting_action_items (meeting_id);

create or replace function public.pm_can_access_meeting(p_meeting_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  select workspace_id into v_workspace_id from pm_meetings where id = p_meeting_id;
  return v_workspace_id is not null and pm_can_access_workspace(v_workspace_id);
end;
$$;

alter table pm_meetings enable row level security;
alter table pm_meeting_attendees enable row level security;
alter table pm_meeting_action_items enable row level security;

create policy pm_akses_meeting_anggota_workspace
  on pm_meetings for all
  using (pm_can_access_workspace(workspace_id))
  with check (pm_can_access_workspace(workspace_id));

create policy pm_akses_meeting_attendee_anggota_meeting
  on pm_meeting_attendees for all
  using (pm_can_access_meeting(meeting_id))
  with check (pm_can_access_meeting(meeting_id));

create policy pm_akses_meeting_action_item_anggota_meeting
  on pm_meeting_action_items for all
  using (pm_can_access_meeting(meeting_id))
  with check (pm_can_access_meeting(meeting_id));

-- Cuma daftar action item yang perlu Postgres Changes (real-time saat
-- tambah/konversi) - isi notulensi (crdt_state) sinkron lewat Broadcast
-- (lihat PmCollaborativeDoc), bukan lewat publication ini.
alter publication supabase_realtime add table pm_meeting_action_items;
