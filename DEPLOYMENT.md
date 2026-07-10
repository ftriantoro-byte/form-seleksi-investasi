# DEPLOYMENT.md — Panduan Setup Supabase, Testing, & Deploy ke Vercel

Dokumen ini untuk tahap 5.2 (testing end-to-end) dan 5.3 (deploy). Ditulis selangkah demi selangkah untuk yang belum pernah pakai Supabase/Vercel. Simpan dokumen ini — form berikutnya (di luar seleksi investasi) akan memakai alur setup Supabase & deploy yang sama.

---

## Bagian 1 — Buat Project Supabase

1. Buka [supabase.com](https://supabase.com), buat akun (bisa pakai GitHub).
2. Klik **New Project**. Isi nama project (mis. "form-internal-perusahaan"), buat password database (simpan baik-baik, jarang dipakai langsung tapi penting), pilih region terdekat (mis. Singapore).
3. Tunggu beberapa menit sampai project selesai dibuat.
4. Buka **Project Settings → API**. Catat dua nilai ini (dibutuhkan di Bagian 2 & 4):
   - **Project URL** (format `https://xxxxx.supabase.co`)
   - **anon public key** (string panjang, bukan `service_role` — jangan pernah pakai `service_role` key di frontend/env var publik)

## Bagian 2 — Jalankan Migration Database

Semua skema database (tabel, RLS, trigger, seed data) sudah ditulis lengkap di `supabase/migrations/`. Jalankan **satu per satu, berurutan sesuai nama file** (nama file diawali angka urut):

1. Buka **SQL Editor** di dashboard Supabase (menu kiri).
2. Untuk tiap file di `supabase/migrations/` (urutan: `20260709120001` → `20260709120002` → ... → `20260709120006`):
   - Buka file-nya di editor kode Anda, copy seluruh isinya.
   - Paste ke SQL Editor Supabase, klik **Run**.
   - Pastikan tidak ada error sebelum lanjut ke file berikutnya.
3. Setelah semua file dijalankan, cek **Table Editor** — harus ada tabel: `user_roles`, `forms`, `submissions`, `approval_chain`, `submission_history`, `scoring_rubrics`. Tabel `forms` harus sudah berisi 1 baris ("seleksi-investasi"), dan `scoring_rubrics` harus berisi 24 baris.

## Bagian 3 — Tambah User untuk Testing

Belum ada UI admin untuk menambah user (lihat ARCHITECTURE.md §4) — dilakukan manual lewat dashboard. Untuk testing end-to-end (tahap 5.2), buat minimal 5 user, satu per role:

Untuk **setiap** user:

1. **Authentication → Users → Add user**. Isi email (boleh email asli atau alias, mis. `evaluator-test@perusahaan.com`) dan password. Centang **Auto Confirm User** supaya tidak perlu verifikasi email.
2. Setelah dibuat, klik user tersebut, **copy User UID**-nya.
3. Buka **Table Editor → user_roles → Insert row**. Isi:
   - `user_id`: paste UID dari langkah 2
   - `role`: salah satu dari `evaluator`, `manajer`, `vp`, `direksi`, `admin`
   - `full_name`: nama lengkap (akan tampil sebagai nama approver di halaman detail & PDF)
4. Ulangi untuk kelima role.

## Bagian 4 — Testing Lokal (sebelum deploy)

1. Buka `.env.local` di folder project, ganti isinya dengan kredensial asli dari Bagian 1:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key-anda>
   ```
2. Jalankan `npm run dev`, buka `http://localhost:3000`.
3. Jalankan skenario tahap 5.2 (checklist di `PANDUAN.md` Prompt 5.2):
   - Login sebagai evaluator, isi Bagian A → B (semua "Ya") → pastikan lanjut ke Bagian C.
   - Buat submission baru, isi Bagian B dengan salah satu "Tidak" → pastikan langsung "TIDAK DILANJUTKAN".
   - Isi Bagian C dengan kombinasi skor berbeda → cek total skor & rekomendasi (Prioritas A/B, Parkir, Tidak Dilanjutkan) sesuai ambang batas.
   - Selesaikan Bagian D → submit → login sebagai manajer → setujui → cek lanjut ke VP.
   - Uji skenario manajer menolak → login lagi sebagai evaluator → pastikan muncul pilihan "Hentikan"/"Teruskan", coba keduanya di submission terpisah.
   - Ulangi pola serupa di tingkat VP.
   - Login sebagai direksi → keputusan final, tidak ada opsi teruskan.
   - Login sebagai admin → cek dashboard menampilkan semua submission.
   - Buka halaman detail submission yang sudah lengkap → klik **Download PDF** → cek layout & data.
4. Beri tahu saya bug yang ditemukan, saya perbaiki sebelum deploy.

## Bagian 5 — Push ke GitHub

Project ini sudah punya git repo lokal (terpisah dari project lain di `D:\PROYEK`), tapi belum ada remote GitHub.

1. Buat repo baru di [github.com/new](https://github.com/new) — **jangan** centang "Add README" (biar tidak konflik dengan riwayat commit lokal).
2. Di terminal, dalam folder `form-seleksi-investasi`:
   ```
   git remote add origin https://github.com/<username>/<nama-repo>.git
   git push -u origin master
   ```
3. Beri tahu saya URL repo-nya kalau butuh bantuan langkah ini.

## Bagian 6 — Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com), buat akun (bisa pakai GitHub yang sama).
2. Klik **Add New → Project**, pilih repo GitHub dari Bagian 5. Karena repo ini isinya langsung project Next.js (bukan di dalam subfolder), tidak perlu ubah **Root Directory**.
3. Di bagian **Environment Variables**, tambahkan dua variable (nilai sama seperti `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   ⚠️ **PENTING — jangan aktifkan toggle "Sensitive"** pada kedua variable ini. Variable berawalan `NEXT_PUBLIC_` memang didesain untuk terlihat di browser (bukan rahasia); kalau ditandai "Sensitive", Next.js **gagal meng-inline nilainya saat build** dan aplikasi akan crash dengan error `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL` begitu diakses — persis yang terjadi di deployment pertama form ini. Kalau sudah terlanjur ditandai Sensitive dan tidak bisa dimatikan togglenya, **hapus variable itu dan buat ulang** dari awal dengan Sensitive tetap OFF.
4. Klik **Deploy**, tunggu build selesai.
5. Setelah dapat URL (format `https://<nama-project>.vercel.app`), buka dan cek halaman `/login` muncul dengan benar.
6. Kalau env var ditambah/diubah **setelah** deploy pertama, wajib **redeploy manual** — perubahan env var tidak otomatis diterapkan ke deployment yang sudah jalan. Caranya: **Deployments** → titik tiga (⋯) pada deployment teratas → **Redeploy**.

## Bagian 7 — Verifikasi Setelah Deploy

Setelah Anda deploy dan kirim URL-nya, beri tahu saya — saya akan bantu:
- Cek halaman login & landing page termuat benar (lewat `WebFetch` ke URL production)
- Cek log runtime di Vercel Dashboard (menu **Logs**) kalau ada error
- Pandu Anda ulangi sebagian skenario testing Bagian 4 di URL production

**Status form Seleksi Investasi:** sudah dijalankan lengkap — repo di [github.com/ftriantoro-byte/form-seleksi-investasi](https://github.com/ftriantoro-byte/form-seleksi-investasi), live di **[form-seleksi-investasi.vercel.app](https://form-seleksi-investasi.vercel.app)**, terverifikasi jalan normal setelah masalah "Sensitive" env var di atas diperbaiki.

---

## Referensi Cepat

| Kebutuhan | Lokasi |
|---|---|
| Kredensial lokal | `.env.local` (jangan commit — sudah di `.gitignore`) |
| Template kredensial | `.env.local.example` |
| Skema database | `supabase/migrations/` (jalankan berurutan) |
| Spesifikasi lengkap form | `PANDUAN.md` |
| Keputusan teknis & alasan | `ARCHITECTURE.md` |
| Checklist & status tahap | `PROGRESS.md` |
