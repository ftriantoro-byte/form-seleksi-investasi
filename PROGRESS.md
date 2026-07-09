# PROGRESS.md — Aplikasi Form Seleksi Investasi (multi-form)

Status legend: `[ ]` belum · `[~]` sedang dikerjakan · `[x]` selesai · `[-]` dilewati (keputusan sadar, bukan belum sempat)

Setiap kali sebuah tahap selesai, checkbox diupdate dan dibuat 1 git commit yang menyebutkan tahap tersebut secara eksplisit (contoh: `feat: selesaikan tahap 1.1 - form Bagian A`).

---

## FASE SETUP

- [x] 0.1 Setup project Next.js, Supabase, struktur folder multi-form
- [x] 0.2 Skema database (forms, submissions, approval_chain, submission_history, user_roles) — SQL ditulis di `supabase/migrations/`, **belum dijalankan** ke project Supabase asli (belum ada project)
- [x] 0.3 Autentikasi Supabase (login, role: Evaluator/Manajer/VP/Direksi/Admin) — kode lengkap, **alur login belum diuji end-to-end** (butuh project Supabase asli)
- [ ] 0.4 Landing page dasar (daftar form, saat ini baru 1: Seleksi Investasi)

## FORM SELEKSI INVESTASI — BAGIAN A (Identitas)

- [ ] 1.1 Form input Bagian A: identitas proposal (10 field)

## FORM SELEKSI INVESTASI — BAGIAN B (Gate)

- [ ] 2.1 Form input Bagian B: 6 kriteria gugur (Ya/Tidak + bukti/catatan)
- [ ] 2.2 Logika auto-stop: jika ada 1 "Tidak", submission otomatis TIDAK DILANJUTKAN, skip Bagian C

## FORM SELEKSI INVESTASI — BAGIAN C (Skoring)

- [ ] 3.1 Form input Bagian C: 8 kriteria skoring (skor 1-5 + justifikasi), muncul HANYA jika lulus gate
- [ ] 3.2 Tampilkan rubrik skoring (skor 1/3/5) sebagai referensi/tooltip saat isi tiap kriteria
- [ ] 3.3 Kalkulasi otomatis: nilai tertimbang per kriteria (bobot x skor) dan total skor

## FORM SELEKSI INVESTASI — BAGIAN D (Hasil & Approval Bertingkat)

- [ ] 4.1 Logika rekomendasi otomatis berdasarkan total skor (4 ambang batas)
- [ ] 4.2 Field catatan evaluator, pernyataan bebas benturan kepentingan
- [ ] 4.3 Alur approval bertingkat: Manajer -> VP -> Direksi, dengan opsi hentikan/teruskan jika ditolak
- [ ] 4.4 Dashboard/riwayat submission (list semua proposal, beda tampilan per role)

## EXPORT & FINALISASI

- [ ] 5.1 Export PDF hasil evaluasi (layout sesuai form Excel, area tanda tangan 4 pihak)
- [ ] 5.2 Testing end-to-end alur lengkap
- [ ] 5.3 Deploy ke Vercel

---

## Catatan Terbuka / Keputusan Tertunda

- `.env.local` saat ini berisi nilai **placeholder/dummy** (`https://placeholder.supabase.co`), hanya supaya dev server tidak crash sebelum project Supabase asli dibuat. Ganti dengan kredensial asli begitu project Supabase dibuat (lihat `.env.local.example`).
- **Project Supabase asli belum dibuat.** File migration di `supabase/migrations/` (tahap 0.2) sudah lengkap tapi belum pernah dijalankan/divalidasi terhadap database sungguhan. Begitu project Supabase tersedia: jalankan ke-4 file migration berurutan lewat SQL Editor (atau `supabase db push`), lalu generate `types/database.ts` (`supabase gen types typescript`), lalu ganti `.env.local` dengan kredensial asli.

- Detail lengkap tiap tahap (nama field Bagian A, teks 6 kriteria gate Bagian B, 8 kriteria skoring+bobot Bagian C, 4 ambang batas rekomendasi Bagian D, alur approval bertingkat) ada di [PANDUAN.md](PANDUAN.md) — sumber kebenaran, jangan diparafrase ulang saat implementasi.
- **Tahap 3.2 diblokir**: isi sheet "Rubrik Skoring" (deskripsi skor 1/3/5 per kriteria C1-C8) dari Excel asli belum ditempel user. Tidak bisa dikerjakan sampai teks ini diberikan.
- Pilihan library PDF export (react-pdf vs puppeteer) akan diputuskan pada tahap 5.1, dicatat di ARCHITECTURE.md.
