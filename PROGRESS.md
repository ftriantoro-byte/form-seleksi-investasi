# PROGRESS.md — Aplikasi Form Seleksi Investasi (multi-form)

Status legend: `[ ]` belum · `[~]` sedang dikerjakan · `[x]` selesai · `[-]` dilewati (keputusan sadar, bukan belum sempat)

Setiap kali sebuah tahap selesai, checkbox diupdate dan dibuat 1 git commit yang menyebutkan tahap tersebut secara eksplisit (contoh: `feat: selesaikan tahap 1.1 - form Bagian A`).

---

## FASE SETUP

- [x] 0.1 Setup project Next.js, Supabase, struktur folder multi-form
- [x] 0.2 Skema database (forms, submissions, approval_chain, submission_history, user_roles) — **dijalankan & diverifikasi** di project Supabase asli
- [x] 0.3 Autentikasi Supabase (login, role: Evaluator/Manajer/VP/Direksi/Admin) — **diuji end-to-end**: login/logout 5 role (evaluator/manajer/vp/direksi/admin) semua berhasil
- [x] 0.4 Landing page dasar (daftar form, saat ini baru 1: Seleksi Investasi) — **diverifikasi di browser**: daftar form tampil, ringkasan per role benar ("Ada N proposal menunggu keputusan Anda", dst)

## FORM SELEKSI INVESTASI — BAGIAN A (Identitas)

- [x] 1.1 Form input Bagian A: identitas proposal (10 field) — **diuji end-to-end** 2x (submission lengkap & submission gagal gate): auto-suggest nomor registrasi (increment benar), default tanggal & target selesai (H+5 hari kerja) benar, CurrencyField format ribuan benar

## FORM SELEKSI INVESTASI — BAGIAN B (Gate)

- [x] 2.1 Form input Bagian B: 6 kriteria gugur (Ya/Tidak + bukti/catatan) — **diuji end-to-end**: badge real-time "Belum lengkap"→"Lulus Gate"/"Tidak Lulus" berubah persis saat radio diklik
- [x] 2.2 Logika auto-stop: jika ada 1 "Tidak", submission otomatis TIDAK DILANJUTKAN, skip Bagian C — **diuji end-to-end** kedua jalur: semua "Ya" → lanjut Bagian C; satu "Tidak" (G3) → "TIDAK DILANJUTKAN" dengan rincian kriteria gagal, Bagian C dikonfirmasi terblokir (fetch langsung ke route-nya)

## FORM SELEKSI INVESTASI — BAGIAN C (Skoring)

- [x] 3.1 Form input Bagian C: 8 kriteria skoring (skor 1-5 + justifikasi), muncul HANYA jika lulus gate — **diuji end-to-end**
- [x] 3.2 Tampilkan rubrik skoring (skor 1/3/5) sebagai referensi/tooltip saat isi tiap kriteria — **diuji end-to-end**: klik tombol "?" C1, teks rubrik yang tampil persis sama dengan isi `Rubik.xlsx`
- [x] 3.3 Kalkulasi otomatis: nilai tertimbang per kriteria (bobot x skor) dan total skor — **diuji end-to-end**: 8 nilai tertimbang + total (3.55) di browser cocok 100% dengan hitungan manual

## FORM SELEKSI INVESTASI — BAGIAN D (Hasil & Approval Bertingkat)

- [x] 4.1 Logika rekomendasi otomatis berdasarkan total skor (4 ambang batas) — **diuji end-to-end**: skor 3.55 → "PRIORITAS B" tampil benar
- [x] 4.2 Field catatan evaluator, pernyataan bebas benturan kepentingan — **diuji end-to-end**
- [x] 4.3 Alur approval bertingkat: Manajer -> VP -> Direksi, dengan opsi hentikan/teruskan jika ditolak — **diuji end-to-end penuh**: Manajer tolak → Evaluator pilih "teruskan" (label audit "diteruskan atas permintaan Evaluator" tampil) → VP setuju → Direksi setuju (final) → status akhir "Disetujui". Jalur "Hentikan proses" **belum dicoba langsung** (hanya code review) — cukup yakin karena polanya simetris dengan "teruskan", tapi tandai sebagai gap kecil kalau mau extra teliti.
- [x] 4.4 Dashboard/riwayat submission (list semua proposal, beda tampilan per role) — **diuji end-to-end**: tab Manajer/VP "Menunggu Keputusan Saya", indikator "perlu keputusan Anda" untuk evaluator saat ada penolakan pending

## EXPORT & FINALISASI

- [x] 5.1 Export PDF hasil evaluasi (layout sesuai form Excel, area tanda tangan 4 pihak) — **diuji end-to-end** dengan submission asli yang sudah disetujui penuh: fetch ke route PDF, status 200, `%PDF-1.3` valid, 7784 bytes
- [x] 5.2 Testing end-to-end alur lengkap — **selesai**, lihat ringkasan di bawah
- [x] 5.3 Deploy ke Vercel — **selesai**. Repo di [github.com/ftriantoro-byte/form-seleksi-investasi](https://github.com/ftriantoro-byte/form-seleksi-investasi), live di **[form-seleksi-investasi.vercel.app](https://form-seleksi-investasi.vercel.app)**, terverifikasi (halaman login termuat benar, bukan error). Satu masalah ditemukan & diperbaiki saat deploy: lihat catatan "Sensitive env var" di bawah.

**Semua tahap FASE SETUP s/d EXPORT & FINALISASI selesai dan terverifikasi. Form Seleksi Investasi production-ready.**

---

## FORM QUICK SCREEN PROYEK — SETUP

- [x] 0.1 Migration: generalisasi trigger `buat_approval_chain_awal()` (kolom `forms.tingkat_approval_maksimal`, default `direksi` sehingga Seleksi Investasi tidak berubah) + seed row `forms` untuk `quick-screen-proyek` (`tingkat_approval_maksimal = 'vp'`)

## FORM QUICK SCREEN PROYEK — BAGIAN A (Identitas Proyek)

- [x] 1.1 Form input Bagian A (11 field: No. Dokumen, Tanggal, Status Dokumen, Nama Proyek, Sektor/Tipologi, Pemilik/Pemberi Informasi, Lokasi, Tanggal Info Diterima, Estimasi Nilai, Sumber Informasi, Deskripsi) — **diuji end-to-end** di browser: auto-suggest No. Dokumen "QSP-2026-001" lalu "QSP-2026-002" (increment benar per tahun), CurrencyField format ribuan benar

## FORM QUICK SCREEN PROYEK — BAGIAN B (Skema Kerjasama)

- [x] 2.1 Tabel 8 opsi skema kerjasama (Ya/Tidak + catatan opsional), bukan gate pass/fail — **diuji end-to-end**: pilih 2 dari 8 skema (Design & Build, BOT), submit, tampil benar dengan tanda ✓/– di halaman review

## FORM QUICK SCREEN PROYEK — BAGIAN C (Penilaian 4 Dimensi)

- [x] 3.1 Form input 20 kriteria skala H/M/L (skor 3/2/1), 4 dimensi x 5 kriteria, catatan opsional per kriteria — **diuji end-to-end** 2x (skor campuran & skor minimum semua)
- [x] 3.2 Kalkulasi skor per dimensi & total skor (maks 60) + radar chart live (Recharts, 4 sumbu skala 0-15) — **diuji end-to-end**: skor campuran (Pasar 13, Teknis 13, Legal 10, Skema&Finansial 7) → total 43, cocok 100% dengan hitungan manual; radar chart live update saat radio diklik
- [x] 3.3 Logika hasil otomatis GO/GO BERSYARAT/CAUTION/NO-GO berdasarkan ambang skor (48/36/28) — **diuji end-to-end** 2 titik: skor 43 → "GO BERSYARAT" (rentang 36-47) benar; skor 20 (semua L) → "NO-GO" (<28) benar. Titik batas 48/36/28 lainnya belum dicoba langsung di browser (hanya code review terhadap `getHasilQuickScreen()`), tapi logikanya if/else sederhana beruntun — risiko rendah

## FORM QUICK SCREEN PROYEK — BAGIAN D & APPROVAL

- [x] 4.1 Field catatan analis (Faktor Pendorong, Faktor Risiko, Data/Dokumen untuk OFT, Urgensi & Tenggat) — **diuji end-to-end**
- [x] 4.2 Alur approval 2 tingkat (Manajer → VP), Setuju/Tolak biasa, tolak di tingkat manapun = langsung final ditolak (tanpa hentikan/teruskan) — **diuji end-to-end penuh** 2 jalur: (a) Manajer setuju → VP setuju (final, badge "tanpa eskalasi" tampil) → status "Disetujui"; (b) submission kedua, Manajer tolak → status langsung "Ditolak" final, tidak ada prompt hentikan/teruskan ke evaluator. Trigger `buat_approval_chain_awal()` terkonfirmasi hanya buat 2 baris approval_chain (manajer, vp) untuk form ini
- [x] 4.3 Dashboard (`/dashboard`) digeneralisasi lintas form (join `forms`, kolom Form, fallback field Bagian A, link dinamis per slug) — **diuji end-to-end**: submission Quick Screen & Seleksi Investasi tampil bersamaan di satu tabel, kolom "Form" membedakan keduanya, data lama Seleksi Investasi (No. Registrasi, skor format 2 desimal, link) tidak berubah

## EXPORT & FINALISASI QUICK SCREEN PROYEK

- [x] 5.1 Export PDF (identitas proyek, skema kerjasama terpilih, skor 4 dimensi + radar chart digambar manual, badge hasil, catatan analis, area tanda tangan Manajer & VP) — **diuji end-to-end**: fetch ke route PDF, status 200, `%PDF-1.3` valid, 5992 bytes, `Content-Type: application/pdf`
- [x] 5.2 Testing end-to-end alur lengkap (A→D, approval Manajer→VP, reject langsung final, PDF) — **selesai**, lihat detail di setiap butir di atas plus regresi Seleksi Investasi di bawah
- [ ] 5.3 Commit & push ke repo yang sama (Vercel auto-deploy) — commit lokal sudah dibuat per tahap, **push ke GitHub belum dilakukan** (menunggu konfirmasi user)

**Regresi nol terhadap Seleksi Investasi dikonfirmasi:** submission baru form Seleksi Investasi (PRP-2026-035) dibuat penuh A→D setelah migration generalisasi trigger dijalankan — approval_chain tetap otomatis berisi 3 baris (Manajer/VP/Direksi, semua "Menunggu") persis seperti sebelumnya. `StepIndicator` form Seleksi Investasi juga tidak berubah tampilannya (masih A/B/C/D dengan label Identitas/Gate/Skoring/Hasil, karena parameter `steps` di komponen itu opsional dengan default sama).

---

## Ringkasan Testing End-to-End (tahap 5.2) — 2026-07-09/10

Dijalankan langsung di browser (Claude Preview) terhadap project Supabase asli milik user, bukan simulasi. Skenario yang lolos:

1. Evaluator (`budi@gmail.com`) buat submission, isi Bagian A → semua default & auto-suggest benar.
2. Bagian B semua "Ya" → lulus gate → lanjut Bagian C.
3. Bagian C 8 skor campuran → kalkulasi & rekomendasi (PRIORITAS B, skor 3.55) benar.
4. Bagian D → submit → status `menunggu_manajer`, 3 baris `approval_chain` otomatis dibuat (trigger).
5. Manajer tolak (dengan catatan) → status TETAP `menunggu_manajer` (menunggu keputusan evaluator, sesuai desain).
6. Evaluator pilih "Tetap teruskan" → status maju ke `menunggu_vp`, label transparansi audit tampil.
7. VP setuju → status `menunggu_direksi`.
8. Direksi setuju (final, tanpa opsi teruskan) → status `disetujui`.
9. Download PDF submission yang sudah lengkap → valid.
10. Submission kedua: Bagian B dengan 1 kriteria "Tidak" (G3) → "TIDAK DILANJUTKAN", Bagian C dikonfirmasi terblokir.
11. Role guard: Direksi mencoba akses `/forms/seleksi-investasi/baru` → ditolak dengan pesan yang benar.

**3 bug nyata ditemukan & diperbaiki selama testing ini** (lihat riwayat commit untuk detail lengkap):
- Nama policy RLS mengandung spasi rawan rusak saat copy-paste ke SQL Editor (`4565d6b`).
- Bug timezone di `tambahHariKerja()` dan default tanggal — hasil mundur 1 hari di server berzona WIB (`c0054ef`).
- **Infinite recursion RLS** antara `submissions` dan `approval_chain` (dua percobaan fix: `a018258` lalu `7f596a3` yang benar-benar menyelesaikannya — pelajaran: fungsi helper RLS harus `plpgsql`, bukan `sql`, supaya tidak di-inline planner).

Belum diuji eksplisit (gap kecil, bukan blocker): jalur "Hentikan proses" (evaluator menghentikan setelah penolakan), tampilan dashboard sebagai admin dengan banyak data, submission_history secara langsung (hanya diverifikasi tidak sengaja lewat log server, bukan lewat UI - belum ada halaman yang menampilkannya).

## Catatan Terbuka / Keputusan Tertunda

- Detail lengkap tiap tahap (nama field Bagian A, teks 6 kriteria gate Bagian B, 8 kriteria skoring+bobot Bagian C, 4 ambang batas rekomendasi Bagian D, alur approval bertingkat) ada di [PANDUAN.md](PANDUAN.md) — sumber kebenaran, jangan diparafrase ulang saat implementasi.
- "Target selesai seleksi awal" default H+5 hari kerja dihitung sekali di server saat halaman dimuat (dari tanggal hari ini), **tidak recompute otomatis** kalau user mengubah tanggal diterima di form (butuh Client Component + JS kalau mau live-update — belum dibangun, dianggap di luar cakupan minimal tahap 1.1). User tetap bisa edit manual field targetSelesai.
- Setelah Bagian C disubmit, `status` submission **tetap** `menunggu_skoring` (tidak berubah ke `menunggu_manajer`) — transisi ke approval bertingkat baru terjadi setelah Bagian D lengkap (termasuk pernyataan bebas benturan kepentingan), sesuai tahap 4.3.
- Beberapa keputusan desain untuk resolusi ambiguitas PANDUAN.md di tahap 4.1-4.3 (rekomendasi bukan status tersendiri, approval tetap jalan penuh berapa pun skornya, "PARKIR - evaluasi ulang maks 1x" belum ada mekanismenya) dicatat lengkap di ARCHITECTURE.md §6.
- "PARKIR - minta perbaikan proposal, evaluasi ulang maksimal 1 kali": teks rekomendasi ini persis dari PANDUAN.md, tapi **mekanisme evaluasi ulang/revisi proposal belum ada** (tidak ada counter, tidak ada alur resubmit). Jika dibutuhkan, ini scope tambahan di luar checklist asli — tanyakan ke user dulu sebelum membangunnya.
- Sanity-check manual (di luar aplikasi, tanpa DB): ambang batas rekomendasi 4.1 dicoba di titik batas (4.00, 3.99, 3.00, 2.99, 2.00, 1.99) — hasil sesuai spesifikasi.
- **Pelajaran deploy Vercel (tahap 5.3):** deployment pertama gagal dengan `Invalid supabaseUrl` walau env var sudah diisi, karena toggle **"Sensitive"** aktif pada `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Variable `NEXT_PUBLIC_*` harus **tidak** ditandai Sensitive (nilainya memang didesain publik/terlihat di browser) — kalau ditandai Sensitive, Next.js gagal meng-inline nilainya saat build. Solusi: hapus & buat ulang variable dengan toggle Sensitive OFF, lalu redeploy. **Catat ini di DEPLOYMENT.md untuk form-form berikutnya** supaya tidak terulang.

---

## MODUL MANAJEMEN PROYEK (PM) — akses terbatas ±3 orang

> Modul KEDUA, terpisah total dari modul form Seleksi Investasi/Quick Screen di atas: tabel relasional sendiri (prefix `pm_`), akses dibatasi lewat `pm_members`, UI di `components/pm/`. Spesifikasi fitur & skema lengkap ada di [PM-MODULE-SPEC.md](PM-MODULE-SPEC.md) — sumber kebenaran. Aturan main & alur kerja ada di [PROMPT-GABUNG-PM.md](PROMPT-GABUNG-PM.md). **JANGAN** mengubah tabel/RLS/kode modul form yang sudah ada di atas kecuali diminta eksplisit.

### FASE A — Inti

- [x] A.1 Skema database inti (`pm_workspaces`, `pm_workspace_members`, `pm_members`, `pm_spaces`, `pm_lists`, `pm_tasks`) + RLS — **dijalankan & diverifikasi** di project Supabase asli (3 migration lewat SQL Editor, admin PM pertama di-bootstrap manual ke `pm_members`); regresi nol dikonfirmasi: landing page & dashboard modul form (Seleksi Investasi + Quick Screen Proyek) tetap tampil normal tanpa error setelah migration
- [x] A.2 Nav & akses: menu modul PM di dashboard cuma muncul untuk user yang ada di `pm_members` — **diuji end-to-end** di browser sungguhan terhadap Supabase asli: `budi@gmail.com` (bukan anggota `pm_members`) tidak melihat link "Manajemen Proyek" & `/pm` menampilkan pesan akses ditolak; `fajar@wikagedung.id` (admin di `pm_members`) melihat link-nya dan berhasil masuk ke halaman placeholder `/pm` tanpa error
- [x] A.3 CRUD Workspace/Space/List (role admin/member, tanpa Guest) — **diuji end-to-end** di browser sungguhan terhadap Supabase asli sebagai admin PM (`fajar@wikagedung.id`): buat Workspace → tambah anggota Workspace → buat Space → buat List → ubah nama List → hapus List → hapus Space → keluarkan anggota → hapus Workspace, semua langkah redirect & refresh data benar tanpa error konsol. Keputusan desain: create/rename/delete Workspace serta kelola anggota Workspace **admin-only** (PM-MODULE-SPEC.md §1 "admin ... kelola Workspace"), CRUD Space/List/Task terbuka untuk semua anggota Workspace. Email anggota ditampilkan lewat fungsi RPC `pm_member_profiles`/`pm_workspace_member_profiles` (SECURITY DEFINER, masing-masing mengecek sendiri hak pemanggil) alih-alih minta admin mengetik nama manual. Regresi nol dikonfirmasi: dashboard & landing page modul form tetap normal (pesan "Role Anda belum diatur" untuk `fajar@wikagedung.id` di `/dashboard` adalah perilaku benar - dia user PM-only, tidak ada baris `user_roles` modul form, bukan bug)
- [ ] A.4 CRUD Task (assignee, due date, status, priority) + Comment + Checklist
- [ ] A.5 List View (tabel) + Board View (Kanban drag-and-drop)
- [ ] A.6 Task Detail (modal/panel: comment, checklist)
- [ ] A.7 Notifikasi in-app sederhana

### FASE B — Lengkapi Fitur Kerja

- [ ] B.1 Folder & Subtask
- [ ] B.2 Calendar View & Gantt View + Task Dependency
- [ ] B.3 Real-time sync via Supabase Realtime (Postgres Changes)
- [ ] B.4 Sistem @mention (user & task)
- [ ] B.5 Docs (editor teks tertaut ke Task) — kolaborasi real-time (CRDT/Yjs via Broadcast)
- [ ] B.6 Custom fields & custom status per List
- [ ] B.7 Dashboard: tab Progres Task, Workload, Resume
- [ ] B.8 Search cepat (Command+K)

### FASE C — Kolaborasi Tambahan

- [ ] C.1 Automasi sederhana (Trigger-Condition-Action, per List)
- [ ] C.2 Template List (simpan & instansiasi ulang)
- [ ] C.3 Whiteboard + konversi sticky note jadi Task
- [ ] C.4 Notulensi Meeting (editor real-time sama dengan Docs + action item → Task)
- [ ] C.5 Time tracking manual (catat menit per Task)
- [ ] C.6 File attachment via Supabase Storage
- [ ] C.7 Ganti password, rename Workspace/Space/List

### FASE D — Penutup

- [ ] D.1 Testing menyeluruh: satu alur pemakaian nyata memakai semua fitur sekaligus, TERMASUK memastikan modul form yang sudah ada tetap jalan normal tanpa regresi
- [ ] D.2 Deploy — push ke repo & Vercel project yang sama, tidak ada setup baru
