-- Modul PM tahap C.3: Whiteboard sederhana per Space + konversi sticky note
-- jadi Task.
--
-- CATATAN CAKUPAN: whiteboard di sini HANYA mendukung sticky note (teks +
-- warna + posisi bebas x/y) - bukan whiteboard penuh ClickUp asli yang juga
-- punya shape/connector/gambar bebas/media. Posisi disimpan sebagai
-- pos_x/pos_y (persentase 0-100 dari lebar/tinggi kanvas, bukan pixel
-- absolut, supaya tetap proporsional di ukuran layar berbeda). Real-time
-- sync-nya pakai Supabase Realtime Postgres Changes (sama seperti Task/Board
-- B.3) - BUKAN Broadcast/CRDT seperti Docs (B.5), karena sticky note adalah
-- objek diskrit (posisi/teks/warna) mirip Task, bukan teks yang diketik
-- karakter-demi-karakter oleh banyak orang sekaligus. Sticky note yang sudah
-- dikonversi jadi Task TETAP ada di papan (task_id diisi, bukan dihapus)
-- supaya jejak "sticky mana yang sudah jadi Task apa" tidak hilang.

create table pm_whiteboards (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references pm_spaces (id) on delete cascade,
  nama text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index pm_whiteboards_space_id_idx on pm_whiteboards (space_id);

create table pm_whiteboard_items (
  id uuid primary key default gen_random_uuid(),
  whiteboard_id uuid not null references pm_whiteboards (id) on delete cascade,
  konten text not null default '',
  warna text not null default 'yellow',
  pos_x numeric not null default 10,
  pos_y numeric not null default 10,
  task_id uuid references pm_tasks (id) on delete set null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pm_whiteboard_items_whiteboard_id_idx on pm_whiteboard_items (whiteboard_id);

create trigger trg_pm_whiteboard_items_updated_at
  before update on pm_whiteboard_items
  for each row
  execute function public.pm_set_updated_at();

create or replace function public.pm_can_access_whiteboard(p_whiteboard_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_space_id uuid;
begin
  select space_id into v_space_id from pm_whiteboards where id = p_whiteboard_id;
  return v_space_id is not null and pm_can_access_space(v_space_id);
end;
$$;

alter table pm_whiteboards enable row level security;
alter table pm_whiteboard_items enable row level security;

create policy pm_akses_whiteboard_anggota_space
  on pm_whiteboards for all
  using (pm_can_access_space(space_id))
  with check (pm_can_access_space(space_id));

create policy pm_akses_whiteboard_item_anggota_whiteboard
  on pm_whiteboard_items for all
  using (pm_can_access_whiteboard(whiteboard_id))
  with check (pm_can_access_whiteboard(whiteboard_id));

alter publication supabase_realtime add table pm_whiteboard_items;
