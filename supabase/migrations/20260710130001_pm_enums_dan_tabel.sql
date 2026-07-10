-- Modul PM (manajemen proyek) tahap A.1: skema inti — enum, tabel, index.
-- Semua tabel prefix pm_, terpisah total dari forms/submissions/approval_chain/
-- submission_history milik modul form. Lihat PM-MODULE-SPEC.md §1-2 dan
-- PROGRESS.md bagian "MODUL MANAJEMEN PROYEK".

-- ── Enum ──────────────────────────────────────────────────────────────────

create type pm_role as enum ('admin', 'member');

-- Custom status per List baru masuk Fase B.6 — sengaja sederhana dulu (A.1).
create type pm_task_status as enum ('to_do', 'in_progress', 'in_review', 'done');

create type pm_task_priority as enum ('urgent', 'high', 'normal', 'low');

-- ── Tabel ─────────────────────────────────────────────────────────────────

-- Whitelist akses modul PM. Baris ini ADA untuk seorang user = boleh masuk
-- modul PM sama sekali (dicek di Server Action, bukan cuma UI - PM-MODULE-SPEC.md §1).
create table pm_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role pm_role not null default 'member',
  created_at timestamptz not null default now()
);

create table pm_workspaces (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  deskripsi text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Semua member Workspace otomatis akses penuh semua Space di dalamnya —
-- tidak ada role Guest/akses granular per-Space (PM-MODULE-SPEC.md §1).
create table pm_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references pm_workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table pm_spaces (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references pm_workspaces (id) on delete cascade,
  nama text not null,
  deskripsi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- folder_id nullable akan ditambah di tahap B.1 (Folder) — untuk A.1, List
-- langsung di bawah Space.
create table pm_lists (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references pm_spaces (id) on delete cascade,
  nama text not null,
  deskripsi text,
  urutan integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Subtask (parent_task_id) ditunda ke tahap B.1 sesuai PM-MODULE-SPEC.md §3.
create table pm_tasks (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references pm_lists (id) on delete cascade,
  judul text not null,
  deskripsi text,
  status pm_task_status not null default 'to_do',
  priority pm_task_priority,
  assignee_id uuid references auth.users (id),
  due_date date,
  urutan integer not null default 0,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pm_workspace_members_user_id_idx on pm_workspace_members (user_id);
create index pm_workspace_members_workspace_id_idx on pm_workspace_members (workspace_id);
create index pm_spaces_workspace_id_idx on pm_spaces (workspace_id);
create index pm_lists_space_id_idx on pm_lists (space_id);
create index pm_tasks_list_id_idx on pm_tasks (list_id);
create index pm_tasks_assignee_id_idx on pm_tasks (assignee_id);
