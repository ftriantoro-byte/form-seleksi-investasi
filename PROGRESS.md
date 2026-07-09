# PROGRESS.md — Aplikasi Form Seleksi Investasi (multi-form)

Status legend: `[ ]` belum · `[~]` sedang dikerjakan · `[x]` selesai · `[-]` dilewati (keputusan sadar, bukan belum sempat)

Setiap kali sebuah tahap selesai, checkbox diupdate dan dibuat 1 git commit yang menyebutkan tahap tersebut secara eksplisit (contoh: `feat: selesaikan tahap 1.1 - form Bagian A`).

---

## FASE SETUP

- [x] 0.1 Setup project Next.js, Supabase, struktur folder multi-form
- [x] 0.2 Skema database (forms, submissions, approval_chain, submission_history, user_roles) — SQL ditulis di `supabase/migrations/`, **belum dijalankan** ke project Supabase asli (belum ada project)
- [x] 0.3 Autentikasi Supabase (login, role: Evaluator/Manajer/VP/Direksi/Admin) — kode lengkap, **alur login belum diuji end-to-end** (butuh project Supabase asli)
- [x] 0.4 Landing page dasar (daftar form, saat ini baru 1: Seleksi Investasi) — kode lengkap, **belum diverifikasi di browser** (halaman di-gate proxy auth, butuh login sungguhan; sudah lolos `tsc --noEmit` & `eslint`)

## FORM SELEKSI INVESTASI — BAGIAN A (Identitas)

- [x] 1.1 Form input Bagian A: identitas proposal (10 field) — kode lengkap, **belum diverifikasi di browser** (di-gate auth; lolos `tsc --noEmit`, `eslint`, dan `next build`)

## FORM SELEKSI INVESTASI — BAGIAN B (Gate)

- [x] 2.1 Form input Bagian B: 6 kriteria gugur (Ya/Tidak + bukti/catatan) — digabung dengan 2.2 dalam 1 commit (form tanpa logika submit tidak berguna sebagai unit terpisah)
- [x] 2.2 Logika auto-stop: jika ada 1 "Tidak", submission otomatis TIDAK DILANJUTKAN, skip Bagian C — kode lengkap, **belum diverifikasi di browser** (lolos `tsc`, `eslint`, `next build`)

## FORM SELEKSI INVESTASI — BAGIAN C (Skoring)

- [x] 3.1 Form input Bagian C: 8 kriteria skoring (skor 1-5 + justifikasi), muncul HANYA jika lulus gate
- [x] 3.2 Tampilkan rubrik skoring (skor 1/3/5) sebagai referensi/tooltip saat isi tiap kriteria — data di tabel `scoring_rubrics` (migration 0005/0006), bukan hardcode UI
- [x] 3.3 Kalkulasi otomatis: nilai tertimbang per kriteria (bobot x skor) dan total skor — matematika diverifikasi manual (bobot total = 1.00, semua skor 5 → total 5.00)

## FORM SELEKSI INVESTASI — BAGIAN D (Hasil & Approval Bertingkat)

- [x] 4.1 Logika rekomendasi otomatis berdasarkan total skor (4 ambang batas) — fungsi murni `getRekomendasi()`, ambang batas diverifikasi manual di semua titik batas
- [x] 4.2 Field catatan evaluator, pernyataan bebas benturan kepentingan — nama evaluator (paraf digital) auto-capture dari session, bukan input manual
- [x] 4.3 Alur approval bertingkat: Manajer -> VP -> Direksi, dengan opsi hentikan/teruskan jika ditolak — proteksi akses via requireRole + RLS (bukan cuma UI)
- [x] 4.4 Dashboard/riwayat submission (list semua proposal, beda tampilan per role) — tab "Menunggu Keputusan Saya"/"Riwayat" untuk manajer/vp/direksi, indikator "perlu keputusan Anda" untuk evaluator

## EXPORT & FINALISASI

- [ ] 5.1 Export PDF hasil evaluasi (layout sesuai form Excel, area tanda tangan 4 pihak)
- [ ] 5.2 Testing end-to-end alur lengkap
- [ ] 5.3 Deploy ke Vercel

---

## Catatan Terbuka / Keputusan Tertunda

- `.env.local` saat ini berisi nilai **placeholder/dummy** (`https://placeholder.supabase.co`), hanya supaya dev server tidak crash sebelum project Supabase asli dibuat. Ganti dengan kredensial asli begitu project Supabase dibuat (lihat `.env.local.example`).
- **Project Supabase asli belum dibuat.** File migration di `supabase/migrations/` (tahap 0.2) sudah lengkap tapi belum pernah dijalankan/divalidasi terhadap database sungguhan. Begitu project Supabase tersedia: jalankan ke-4 file migration berurutan lewat SQL Editor (atau `supabase db push`), lalu generate `types/database.ts` (`supabase gen types typescript`), lalu ganti `.env.local` dengan kredensial asli.

- Detail lengkap tiap tahap (nama field Bagian A, teks 6 kriteria gate Bagian B, 8 kriteria skoring+bobot Bagian C, 4 ambang batas rekomendasi Bagian D, alur approval bertingkat) ada di [PANDUAN.md](PANDUAN.md) — sumber kebenaran, jangan diparafrase ulang saat implementasi.
- ~~Tahap 3.2 diblokir~~ — isi rubrik skoring sudah diberikan user (`Rubik.xlsx`) dan dicatat lengkap di PANDUAN.md, tidak lagi jadi blocker.
- Pilihan library PDF export (react-pdf vs puppeteer) akan diputuskan pada tahap 5.1, dicatat di ARCHITECTURE.md.
- Redirect setelah submit Bagian A menuju `/forms/seleksi-investasi/[submissionId]/bagian-b`, saat ini masih halaman stub (placeholder) — akan diisi sungguhan di tahap 2.1.
- "Target selesai seleksi awal" default H+5 hari kerja dihitung sekali di server saat halaman dimuat (dari tanggal hari ini), **tidak recompute otomatis** kalau user mengubah tanggal diterima di form (butuh Client Component + JS kalau mau live-update — belum dibangun, dianggap di luar cakupan minimal tahap 1.1). User tetap bisa edit manual field targetSelesai.
- Migration `20260709120005_scoring_rubrics.sql` & `...0006_seed_scoring_rubrics.sql` (tahap 3.2) juga belum dijalankan ke Supabase asli — sama seperti migration lain, menunggu project Supabase dibuat.
- Setelah Bagian C disubmit, `status` submission **tetap** `menunggu_skoring` (tidak berubah ke `menunggu_manajer`) — transisi ke approval bertingkat baru terjadi setelah Bagian D lengkap (termasuk pernyataan bebas benturan kepentingan), sesuai tahap 4.3.
- Beberapa keputusan desain penting untuk resolusi ambiguitas di tahap 4.1-4.3 (rekomendasi bukan status tersendiri, approval tetap jalan penuh berapa pun skornya, "PARKIR - evaluasi ulang maks 1x" belum ada mekanismenya, nama approver belum ditampilkan) dicatat lengkap di ARCHITECTURE.md §6 — **wajib dibaca sebelum lanjut ke 5.1** (PDF butuh nama approver, masalah ini harus diselesaikan dulu).
- Sanity-check manual (di luar aplikasi, tanpa DB): ambang batas rekomendasi 4.1 dicoba di titik batas (4.00, 3.99, 3.00, 2.99, 2.00, 1.99) — hasil sesuai spesifikasi.
