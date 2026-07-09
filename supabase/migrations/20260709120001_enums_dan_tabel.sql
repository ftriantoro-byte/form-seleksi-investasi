-- Tahap 0.2: skema inti — enum, tabel, index.
-- Lihat ARCHITECTURE.md §3 untuk penjelasan tiap kolom & diagram alur status.

-- ── Enum ──────────────────────────────────────────────────────────────────

create type app_role as enum ('evaluator', 'manajer', 'vp', 'direksi', 'admin');

create type submission_status as enum (
  'draft',
  'menunggu_skoring',
  'tidak_lulus_gate',
  'menunggu_manajer',
  'menunggu_vp',
  'menunggu_direksi',
  'disetujui',
  'ditolak'
);

create type approval_tingkat as enum ('manajer', 'vp', 'direksi');

create type approval_status as enum ('menunggu', 'disetujui', 'ditolak');

create type tingkat_approval_saat_ini as enum ('manajer', 'vp', 'direksi', 'selesai');

-- ── Tabel ─────────────────────────────────────────────────────────────────

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now()
);

create table forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nama text not null,
  deskripsi text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms (id),
  dibuat_oleh uuid not null references auth.users (id),
  data jsonb not null default '{}'::jsonb,
  status submission_status not null default 'draft',
  tingkat_approval_saat_ini tingkat_approval_saat_ini,
  total_skor numeric(4, 2),
  dibuat_pada timestamptz not null default now(),
  diupdate_pada timestamptz not null default now()
);

create index submissions_form_id_idx on submissions (form_id);
create index submissions_dibuat_oleh_idx on submissions (dibuat_oleh);
create index submissions_status_idx on submissions (status);

create table approval_chain (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  tingkat approval_tingkat not null,
  status approval_status not null default 'menunggu',
  approver_user_id uuid references auth.users (id),
  catatan text,
  diteruskan_meski_ditolak boolean not null default false,
  diputuskan_pada timestamptz,
  unique (submission_id, tingkat)
);

create index approval_chain_submission_id_idx on approval_chain (submission_id);

create table submission_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  status_lama text,
  status_baru text,
  diubah_oleh uuid not null references auth.users (id),
  catatan text,
  "timestamp" timestamptz not null default now()
);

create index submission_history_submission_id_idx on submission_history (submission_id);
