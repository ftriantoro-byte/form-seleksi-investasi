# PM-MODULE-SPEC.md — Spesifikasi Fitur Modul Manajemen Proyek

Dokumen ini adalah referensi FITUR & SKEMA DATA untuk modul manajemen proyek (mirip ClickUp) yang akan digabungkan ke dalam aplikasi `form-seleksi-investasi` yang sudah ada. Baca bersama `PROMPT-GABUNG-PM.md` (instruksi cara mulai mengerjakan) — dokumen ini murni "apa yang dibangun", bukan "bagaimana cara mulai".

Referensi asal fitur: aplikasi ClickUp-clone terpisah (Node/Express/Prisma/PostgreSQL + React), sudah lengkap dan teruji. Modul ini membangun ulang fitur-fiturnya dengan stack yang SAMA dengan `form-seleksi-investasi` (Next.js + Supabase), disederhanakan untuk dipakai ~3 orang saja (bukan seluruh staf yang pakai aplikasi form ini).

---

## 1. Siapa yang boleh akses

Modul PM **BUKAN untuk semua orang yang punya akun di aplikasi form ini** — cuma untuk sekelompok kecil user (±3 orang) yang di-grant akses secara eksplisit, terpisah total dari role form (Evaluator/Manajer/VP/Direksi/Admin).

- Tabel baru `pm_members`: `user_id` (FK ke `auth.users`/`profiles`), `role` (`admin` | `member`), `created_at`. Cuma user yang punya baris di tabel ini yang bisa mengakses route/data PM sama sekali.
- `admin` di konteks PM bisa invite anggota baru (tambah baris `pm_members` untuk user yang SUDAH punya akun form-seleksi-investasi — bukan bikin akun baru) dan kelola Workspace; `member` akses penuh ke Workspace yang dia ikuti tapi tidak bisa kelola anggota.
- Tidak ada role `guest`/akses granular per-Space seperti aplikasi ClickUp-clone aslinya — untuk 3 orang, semua `member` dalam satu Workspace otomatis bisa akses semua Space di dalamnya.
- User form-seleksi-investasi yang TIDAK ada di `pm_members` tidak akan melihat menu/nav modul PM sama sekali (bukan cuma disembunyikan di UI — dicek juga di tiap Server Action).

## 2. Skema Database

**Semua tabel baru pakai prefix `pm_`** — supaya jelas terpisah dari tabel `forms`/`submissions`/`approval_chain`/`submission_history` milik modul form, tidak ada risiko tercampur atau tabrakan nama.

Tabel inti (mengikuti hierarki ClickUp-clone asli): `pm_workspaces`, `pm_spaces`, `pm_folders`, `pm_lists`, `pm_tasks`, `pm_comments`, `pm_checklist_items`, `pm_task_dependencies`, `pm_docs` (isi teks + `crdt_state bytea` untuk kolaborasi real-time), `pm_custom_field_definitions`, `pm_custom_field_values`, `pm_automations`, `pm_whiteboards`, `pm_whiteboard_items`, `pm_time_entries`, `pm_attachments`, `pm_notifications`, `pm_meetings`, `pm_meeting_attendees`, `pm_meeting_action_items` (detail Notulensi Meeting di bagian 4 di bawah).

**Otorisasi via RLS** — konsisten dengan pola yang SUDAH dipakai aplikasi form ini (bukan pola "hindari RLS" dari draft rencana sebelumnya yang sudah tidak berlaku). Semua tabel `pm_*` pakai Row Level Security:
- Baca/tulis Workspace & isinya: cek `EXISTS` baris `pm_members` untuk user itu DAN dia anggota Workspace terkait (lewat tabel keanggotaan Workspace, mis. `pm_workspace_members`).
- Aksi admin-only (hapus Workspace, kelola anggota PM): cek tambahan `pm_members.role = 'admin'`.
- Ikuti gaya penulisan policy yang sudah ada di `supabase/` (lihat migration form-seleksi-investasi yang sudah ada sebagai contoh persis).

## 3. Daftar Fitur (kerjakan bertahap, ikuti PROGRESS.md)

Tidak ada fitur yang dibuang dari rencana sebelumnya — semua tetap dipakai, ditambah Notulensi Meeting (bagian 4).

### Fase A — Inti
- [ ] A.1 Skema database inti (`pm_workspaces`, `pm_workspace_members`, `pm_members`, `pm_spaces`, `pm_lists`, `pm_tasks`) + RLS
- [ ] A.2 Nav & akses: menu modul PM di dashboard cuma muncul untuk user yang ada di `pm_members`
- [ ] A.3 CRUD Workspace/Space/List (role admin/member, tanpa Guest)
- [ ] A.4 CRUD Task (assignee, due date, status, priority) + Comment + Checklist
- [ ] A.5 List View (tabel) + Board View (Kanban drag-and-drop)
- [ ] A.6 Task Detail (modal/panel: comment, checklist)
- [ ] A.7 Notifikasi in-app sederhana

### Fase B — Lengkapi Fitur Kerja
- [ ] B.1 Folder & Subtask
- [ ] B.2 Calendar View & Gantt View + Task Dependency
- [ ] B.3 Real-time sync via Supabase Realtime (task update langsung ke semua yang buka List yang sama — lihat bagian 5)
- [ ] B.4 Sistem @mention (user & task)
- [ ] B.5 Docs (editor teks tertaut ke Task) — termasuk kolaborasi real-time (CRDT), lihat bagian 5
- [ ] B.6 Custom fields & custom status per List
- [ ] B.7 Dashboard: tab **Progres Task**, **Workload**, **Resume** (ringkasan task selesai/terlambat/on-schedule/tanpa-due-date)
- [ ] B.8 Search cepat (Command+K) — kalau aplikasi form ini sudah punya search sendiri, pertimbangkan digabung jadi satu search box yang mencari lintas modul (form + PM), tapi ini opsional, bisa dipisah dulu

### Fase C — Kolaborasi Tambahan
- [ ] C.1 Automasi sederhana (Trigger-Condition-Action, per List)
- [ ] C.2 Template List (simpan & instansiasi ulang)
- [ ] C.3 Whiteboard + konversi sticky note jadi Task
- [ ] C.4 **Notulensi Meeting** (fitur baru — detail lengkap di bagian 4)
- [ ] C.5 Time tracking manual (catat menit per Task)
- [ ] C.6 File attachment via Supabase Storage
- [ ] C.7 Ganti password (kemungkinan besar pakai halaman akun yang sudah ada di aplikasi form ini), rename Workspace/Space/List

### Fase D — Penutup
- [ ] D.1 Testing menyeluruh: satu alur pemakaian nyata memakai semua fitur sekaligus, TERMASUK memastikan modul form yang sudah ada tetap jalan normal tanpa regresi
- [ ] D.2 Deploy — push ke repo & Vercel project yang sama, tidak ada setup baru

## 4. Fitur Baru: Notulensi Meeting

Catatan rapat kolaboratif, terhubung ke Workspace (opsional dikaitkan ke Space/List tertentu untuk pengelompokan). Desainnya sengaja meniru 2 pola yang sudah ada supaya konsisten, bukan bikin pola baru:

- **Isi notulensi pakai editor kolaboratif real-time yang SAMA dengan Docs** (bagian B.5) — beberapa orang bisa ngetik notulensi bersamaan saat meeting berlangsung, bukan cuma satu orang jadi notulis sementara yang lain menunggu.
- **Action item bisa dikonversi jadi Task satu klik** — pola identik dengan "konversi sticky note Whiteboard jadi Task" (C.3). Action item BUKAN teks bebas di dalam catatan, tapi baris terstruktur tersendiri: deskripsi + PIC (assignee, pilih dari anggota Workspace) + tenggat (opsional) + tombol "Jadikan Task".

**Skema** (detail dari daftar tabel di bagian 2):
- `pm_meetings`: `id`, `workspace_id`, `space_id` (nullable), `title`, `meeting_date`, `created_by`, `crdt_state bytea` (state Yjs, sama pola dengan `pm_docs`), `created_at`, `updated_at`
- `pm_meeting_attendees`: `meeting_id`, `user_id` — daftar peserta, dipilih dari anggota Workspace
- `pm_meeting_action_items`: `id`, `meeting_id`, `description`, `assignee_id` (nullable), `due_date` (nullable), `task_id` (nullable, FK ke `pm_tasks` — terisi begitu action item dikonversi jadi Task), `created_at`

**Alur pemakaian yang diharapkan**: buat meeting baru → isi judul/tanggal/peserta → tulis notulensi bareng-bareng secara real-time selama/setelah rapat → catat action item di panel terpisah (bukan campur dengan teks notulensi) → klik "Jadikan Task" per action item yang perlu ditindaklanjuti → Task otomatis muncul di List yang dipilih, dengan assignee & due date ter-isi dari action item.

Daftar meeting per Workspace bisa dilihat sebagai riwayat (list meeting terbaru dulu), dan ikut masuk hasil Search cepat (B.8).

## 5. Catatan Teknis: Real-time via Supabase Realtime (bukan Socket.IO)

- **Update Task/List real-time**: pakai **Postgres Changes** — client subscribe ke perubahan tabel `pm_tasks` (filter `list_id`) lewat `supabase.channel(...).on('postgres_changes', ...)`. Supabase otomatis broadcast INSERT/UPDATE/DELETE, tidak perlu emit manual di Server Action.
- **Kolaborasi Docs & Notulensi Meeting (Yjs/CRDT)**: pakai fitur **Broadcast** (channel per Doc/Meeting, client saling kirim potongan update Yjs lewat `channel.send({type:'broadcast', ...})`). Penyimpanan state Yjs ke `crdt_state` dilakukan lewat Server Action yang dipanggil client berkala (debounce ~1.5 detik).

---

*Baca file ini bersama `PROMPT-GABUNG-PM.md` sebelum mulai coding.*
