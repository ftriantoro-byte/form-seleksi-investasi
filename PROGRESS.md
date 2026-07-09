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

- [x] 5.1 Export PDF hasil evaluasi (layout sesuai form Excel, area tanda tangan 4 pihak) — `@react-pdf/renderer` dipilih (lebih ringan dari puppeteer di Vercel), diuji langsung dengan `renderToBuffer` + data mock (2 skenario: lengkap & gagal gate), hasil PDF valid
- [ ] 5.2 Testing end-to-end alur lengkap — **butuh project Supabase asli**, belum bisa dijalankan; checklist skenario ada di DEPLOYMENT.md Bagian 4
- [~] 5.3 Deploy ke Vercel — persiapan selesai (env var sudah eksternal sejak 0.1, `.env.local.example` ada, `DEPLOYMENT.md` ditulis lengkap langkah demi langkah); **eksekusi deploy sungguhan menunggu aksi user** (buat project Supabase, push ke GitHub, deploy di Vercel)

---

## Status Kritis: Belum Ada Project Supabase Asli

**Semua kode (tahap 0.1-5.1) ditulis dan lolos `tsc --noEmit`/`eslint`/`next build`, tapi HAMPIR TIDAK ADA yang pernah dites terhadap database/auth sungguhan.** `.env.local` masih berisi kredensial **placeholder/dummy** (`https://placeholder.supabase.co`), hanya supaya dev server tidak crash. Verifikasi sejauh ini terbatas pada: type-check, lint, production build, sanity-check matematika manual (kalkulasi skor, ambang batas rekomendasi), dan uji generate PDF dengan data mock langsung lewat `renderToBuffer` (tanpa lewat browser/route).

**Langkah selanjutnya ada di [DEPLOYMENT.md](DEPLOYMENT.md)**: buat project Supabase, jalankan 6 file migration di `supabase/migrations/` berurutan, tambah user test per role, baru testing end-to-end (5.2) benar-benar bisa dijalankan. Sampai itu terjadi, anggap seluruh alur data (RLS, trigger auto-approval-chain, Server Actions) sebagai **belum terverifikasi**, bukan "sudah selesai".

## Catatan Terbuka / Keputusan Tertunda

- Detail lengkap tiap tahap (nama field Bagian A, teks 6 kriteria gate Bagian B, 8 kriteria skoring+bobot Bagian C, 4 ambang batas rekomendasi Bagian D, alur approval bertingkat) ada di [PANDUAN.md](PANDUAN.md) — sumber kebenaran, jangan diparafrase ulang saat implementasi.
- "Target selesai seleksi awal" default H+5 hari kerja dihitung sekali di server saat halaman dimuat (dari tanggal hari ini), **tidak recompute otomatis** kalau user mengubah tanggal diterima di form (butuh Client Component + JS kalau mau live-update — belum dibangun, dianggap di luar cakupan minimal tahap 1.1). User tetap bisa edit manual field targetSelesai.
- Setelah Bagian C disubmit, `status` submission **tetap** `menunggu_skoring` (tidak berubah ke `menunggu_manajer`) — transisi ke approval bertingkat baru terjadi setelah Bagian D lengkap (termasuk pernyataan bebas benturan kepentingan), sesuai tahap 4.3.
- Beberapa keputusan desain untuk resolusi ambiguitas PANDUAN.md di tahap 4.1-4.3 (rekomendasi bukan status tersendiri, approval tetap jalan penuh berapa pun skornya, "PARKIR - evaluasi ulang maks 1x" belum ada mekanismenya) dicatat lengkap di ARCHITECTURE.md §6.
- "PARKIR - minta perbaikan proposal, evaluasi ulang maksimal 1 kali": teks rekomendasi ini persis dari PANDUAN.md, tapi **mekanisme evaluasi ulang/revisi proposal belum ada** (tidak ada counter, tidak ada alur resubmit). Jika dibutuhkan, ini scope tambahan di luar checklist asli — tanyakan ke user dulu sebelum membangunnya.
- Sanity-check manual (di luar aplikasi, tanpa DB): ambang batas rekomendasi 4.1 dicoba di titik batas (4.00, 3.99, 3.00, 2.99, 2.00, 1.99) — hasil sesuai spesifikasi.
