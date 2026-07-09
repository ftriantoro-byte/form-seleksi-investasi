# ARCHITECTURE.md — Aplikasi Form Seleksi Investasi (multi-form)

Dokumen ini mencatat keputusan teknis: tech stack, struktur folder, skema database, dan konvensi. Diupdate setiap kali ada keputusan arsitektur baru.

> Detail spesifik form seleksi investasi (nama field persis, teks 6 kriteria gate, 8 kriteria skoring + bobot, 4 ambang batas rekomendasi, alur approval bertingkat) ada di [PANDUAN.md](PANDUAN.md) — dokumen itu adalah sumber kebenaran untuk teks/angka yang tidak boleh diparafrase ulang. Skema database di §3 di bawah sudah disinkronkan dengan PANDUAN.md.

---

## 1. Tech Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Frontend + Backend | Next.js 14+ (App Router, Server Actions) | Satu framework untuk UI + logic server, cocok untuk form-heavy app dengan banyak validasi & alur approval di server side |
| Database | Supabase (Postgres) | Managed Postgres + Row Level Security, cocok untuk role-based access (Evaluator/Manajer/VP/Direksi/Admin) tanpa perlu backend auth terpisah |
| Auth | Supabase Auth | Terintegrasi langsung dengan Postgres RLS; role disimpan di tabel `profiles` |
| Styling | Tailwind CSS | Cepat untuk form kompleks dengan banyak state (gate, skoring, approval) |
| PDF export | `@react-pdf/renderer` (lihat §7) | Ringan untuk Vercel serverless (tidak butuh Chromium seperti puppeteer), layout tabel + area tanda tangan cukup dengan primitif View/Text |
| Deploy | Vercel | Native untuk Next.js |

### Kenapa desain generik (forms + submissions), bukan tabel per form

Aplikasi ini akan menampung form lain di masa depan (landing page memuat daftar form). Alih-alih membuat tabel baru setiap kali ada form baru, data spesifik form disimpan sebagai JSONB di tabel `submissions`, dengan validasi bentuk (shape) dilakukan di application layer (Zod schema per form, bukan di database). Struktur form yang butuh query/agregasi lintas-submission (skor total, status approval) tetap punya kolom relasional (`total_score`, `status`, dll) di luar JSONB agar bisa diindeks dan di-query langsung.

---

## 2. Struktur Folder

```
form-seleksi-investasi/
├── PROGRESS.md
├── ARCHITECTURE.md
├── app/
│   ├── layout.tsx
│   ├── page.tsx                       # Landing page: daftar form yang tersedia
│   ├── login/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx                   # Riwayat submission, tampilan beda per role
│   └── forms/
│       └── seleksi-investasi/
│           ├── page.tsx               # Wizard/form multi-bagian (A-D)
│           └── [submissionId]/
│               ├── page.tsx           # Detail submission (view/approval)
│               └── pdf/route.ts       # (tahap 5.1) generate/stream PDF
├── components/
│   ├── ui/                            # komponen generik (Button, Input, dst)
│   └── forms/
│       └── seleksi-investasi/
│           ├── BagianA.tsx
│           ├── BagianB.tsx
│           ├── BagianC.tsx
│           └── BagianD.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # browser client
│   │   ├── server.ts                  # server component/action client
│   │   └── middleware.ts              # session refresh
│   └── forms/
│       └── seleksi-investasi/
│           ├── schema.ts              # Zod schema + definisi 10/6/8 field per bagian
│           ├── rubrik.ts              # rubrik skoring 1/3/5 + bobot per kriteria
│           └── calculations.ts        # kalkulasi nilai tertimbang, total skor, rekomendasi
├── actions/
│   └── submissions.ts                 # Server Actions: create/update submission, approval
├── types/
│   └── database.ts                    # tipe hasil generate dari skema Supabase
├── proxy.ts                           # proteksi route + refresh session Supabase (nama file "middleware.ts" dideprecate di Next.js 16, lihat §5)
└── supabase/
    └── migrations/                    # SQL migration, sumber kebenaran skema DB
```

Prinsip: setiap form baru di masa depan cukup menambah folder di `app/forms/<slug>`, `components/forms/<slug>`, dan `lib/forms/<slug>` — tanpa mengubah skema database inti.

---

## 3. Skema Database

Skema di bawah persis mengikuti spesifikasi di [PANDUAN.md](PANDUAN.md) Prompt 0.2 — nama kolom sengaja dalam Bahasa Indonesia agar konsisten dengan istilah form Excel asli (status, nama field) yang dipakai user & approver.

### `user_roles`
Role aplikasi per user, terpisah dari `auth.users` bawaan Supabase (tidak ada tabel `profiles` terpisah). Menyimpan `full_name` sendiri (bukan dari `auth.users.raw_user_meta_data`) karena `auth.users` tidak bisa di-query langsung lewat client biasa — dibutuhkan untuk menampilkan nama approver di halaman detail/dashboard/PDF (lihat §6).

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → auth.users(id), unique | satu role per user |
| role | enum: `evaluator`, `manajer`, `vp`, `direksi`, `admin` | |
| full_name | text | diisi manual oleh admin saat menambah user (§4) |
| created_at | timestamptz | default now() |

### `forms`
Daftar jenis form yang tersedia (ditampilkan di landing page).

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| slug | text, unique | mis. `seleksi-investasi`, dipakai di URL `/forms/<slug>` |
| nama | text | nama tampilan |
| deskripsi | text | |
| aktif | boolean | default true, untuk sembunyikan form tanpa hapus data |
| created_at | timestamptz | |

### `submissions`
Satu baris = satu pengajuan, form apapun jenisnya.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| form_id | uuid, FK → forms(id) | |
| dibuat_oleh | uuid, FK → auth.users(id) | |
| data | jsonb | seluruh isi Bagian A-D form seleksi investasi (field spesifik form, lihat PANDUAN.md untuk daftar field persis) |
| status | enum: `draft`, `menunggu_skoring`, `tidak_lulus_gate`, `menunggu_manajer`, `menunggu_vp`, `menunggu_direksi`, `disetujui`, `ditolak` | |
| tingkat_approval_saat_ini | enum: `manajer`, `vp`, `direksi`, `selesai`, nullable | null selama masih draft/gate/skoring, diisi begitu masuk alur approval |
| total_skor | numeric, nullable | hasil kalkulasi Bagian C, null jika gate gagal |
| dibuat_pada | timestamptz | |
| diupdate_pada | timestamptz | |

Enum `status` di atas spesifik untuk alur seleksi investasi (gate → skoring → approval 3 tingkat). Form masa depan dengan alur approval berbeda kemungkinan butuh nilai status sendiri atau pendekatan berbeda — **tidak di-generalisasi sekarang** (lihat catatan "jangan over-engineer" di PANDUAN.md), direvisit saat form kedua mulai dikerjakan.

**Diagram alur status (teks):**

```
draft
  └─(submit Bagian A)──> draft (lanjut isi Bagian B)
  └─(submit Bagian B, semua gate "Ya")──> menunggu_skoring
  └─(submit Bagian B, ada gate "Tidak")──> tidak_lulus_gate  [BERHENTI, final]

menunggu_skoring
  └─(submit Bagian C+D, total_skor dihitung)──> menunggu_manajer
       (tingkat_approval_saat_ini = manajer; 3 baris approval_chain dibuat: manajer/vp/direksi, semua "menunggu")

menunggu_manajer
  └─(manajer: Setuju)──> menunggu_vp                (tingkat_approval_saat_ini = vp)
  └─(manajer: Tolak, evaluator pilih "hentikan")──> ditolak   [final]
  └─(manajer: Tolak, evaluator pilih "teruskan")──> menunggu_vp
       (approval_chain manajer: status=ditolak, diteruskan_meski_ditolak=true)

menunggu_vp
  └─(vp: Setuju)──> menunggu_direksi                 (tingkat_approval_saat_ini = direksi)
  └─(vp: Tolak, evaluator pilih "hentikan")──> ditolak        [final]
  └─(vp: Tolak, evaluator pilih "teruskan")──> menunggu_direksi
       (approval_chain vp: status=ditolak, diteruskan_meski_ditolak=true)

menunggu_direksi
  └─(direksi: Setuju)──> disetujui   [final, tingkat_approval_saat_ini = selesai]
  └─(direksi: Tolak)──> ditolak      [final, tidak ada opsi teruskan — direksi adalah tingkat terakhir]
```

### `approval_chain`
Mencatat keputusan tiap tingkat (manajer/vp/direksi) per submission. 3 baris dibuat otomatis begitu submission lulus gate + skoring dan disubmit (status → `menunggu_manajer`).

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| submission_id | uuid, FK → submissions(id) | |
| tingkat | enum: `manajer`, `vp`, `direksi` | urutan tetap tersirat dari nilai enum, tidak perlu kolom sequence terpisah |
| status | enum: `menunggu`, `disetujui`, `ditolak` | |
| approver_user_id | uuid, FK → auth.users(id), nullable | nullable sampai approver mengambil keputusan |
| catatan | text | wajib diisi approver saat memutuskan |
| diteruskan_meski_ditolak | boolean | default false; true jika ditolak di tingkat ini tapi evaluator memilih tetap teruskan ke tingkat berikutnya |
| diputuskan_pada | timestamptz, nullable | |

### `submission_history`
Audit trail append-only — **tidak boleh ada UPDATE/DELETE oleh role non-admin** (lihat §4a, form ini adalah dokumen tata kelola yang wajib bisa diaudit sesuai UU BUMN/Permen BUMN/ISO 31000).

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| submission_id | uuid, FK → submissions(id) | |
| status_lama | text, nullable | |
| status_baru | text, nullable | |
| diubah_oleh | uuid, FK → auth.users(id) | |
| catatan | text, nullable | mis. keputusan apa, apakah ada eskalasi meski ditolak |
| timestamp | timestamptz | default now() |

### `scoring_rubrics` (dibuat pada tahap 3.2)
Rubrik skoring 1/3/5 per kriteria C1-C8, disimpan sebagai data terstruktur (bukan hardcode di UI) agar bisa diedit admin tanpa ubah kode. **Struktur kolom final ditentukan saat tahap 3.2 dikerjakan**, setelah isi lengkap sheet "Rubrik Skoring" dari Excel asli ditempel oleh user (lihat status di PANDUAN.md — belum tersedia). Perkiraan kolom: `id`, `kriteria_kode` (C1-C8), `skor_level` (1/3/5), `deskripsi`, `validasi_minimum`.

### Row Level Security (RLS)

- `user_roles`: user hanya bisa baca baris sendiri; hanya admin yang bisa insert/update (penambahan user+role dilakukan admin manual lewat Supabase dashboard, lihat tahap 0.3).
- `submissions`:
  - Evaluator: lihat & tulis submission miliknya sendiri (`dibuat_oleh = auth.uid()`).
  - Manajer: lihat submission berstatus `menunggu_manajer`, ATAU submission yang punya baris `approval_chain` tingkat manajer dengan `approver_user_id = auth.uid()` (histori yang pernah mereka putuskan).
  - VP: sama seperti manajer tapi untuk tingkat `vp` (termasuk baca histori tingkat manajer sebelumnya untuk konteks — didapat lewat join ke `approval_chain`, bukan kolom terpisah).
  - Direksi: sama seperti VP tapi untuk tingkat `direksi`.
  - Admin: lihat semua.
- `approval_chain`, `submission_history`: baca mengikuti akses ke `submissions` terkait (policy join). Tulis hanya lewat Server Action yang memverifikasi role via `user_roles`, bukan hanya disembunyikan di UI. `submission_history` tanpa policy UPDATE/DELETE sama sekali (append-only, termasuk untuk admin).

### Implementasi (tahap 0.2)

SQL lengkap (enum, tabel, index, RLS, seed) ada di `supabase/migrations/`, dijalankan berurutan sesuai nama file:

1. `20260709120001_enums_dan_tabel.sql` — enum, 5 tabel inti, index.
2. `20260709120002_fungsi_dan_trigger.sql` — `current_user_role()` (helper `SECURITY DEFINER` dipakai berulang di RLS, supaya lookup role tidak terhalang RLS `user_roles` itu sendiri), trigger auto-update `diupdate_pada`, trigger `buat_approval_chain_awal` (begitu `status` submission jadi `menunggu_manajer`, otomatis insert 3 baris `approval_chain` — manajer/vp/direksi, semua `menunggu`).
3. `20260709120003_rls_policies.sql` — seluruh policy sesuai aturan visibilitas per role di atas. `submission_history` sengaja tanpa policy UPDATE/DELETE sama sekali (append-only, termasuk untuk admin).
4. `20260709120004_seed_forms.sql` — insert baris `forms` untuk `seleksi-investasi` (dipakai landing page tahap 0.4).

Migration ini belum dijalankan ke project Supabase manapun — menunggu project Supabase asli dibuat (lihat catatan `.env.local` di PROGRESS.md). Setelah project ada, jalankan lewat Supabase SQL Editor (copy-paste tiap file berurutan) atau `supabase db push` jika Supabase CLI sudah di-setup.

Belum ada `types/database.ts` hasil codegen (`supabase gen types typescript`) karena butuh project Supabase live — akan digenerate begitu koneksi tersedia.

---

## 4. Autentikasi & Role

### Email/password vs magic link (tahap 0.3)

Dipilih **email/password** sebagai metode login utama. Trade-off yang dipertimbangkan:

| | Email/password | Magic link |
|---|---|---|
| Kecepatan login harian | Cepat, tidak perlu buka email tiap kali | Perlu buka email & klik link tiap login — lambat untuk pemakaian rutin (Manajer/VP/Direksi cek dashboard tiap hari) |
| Ketergantungan availability email | Tidak ada | Login gagal total kalau email perusahaan lambat/delay (umum pada email korporat dengan filter spam ketat) |
| Keamanan | Perlu kebijakan reset password (ditangani built-in Supabase) | Tidak ada password untuk dicuri/lemah, tapi akun jadi bergantung penuh pada keamanan inbox email |
| Kesesuaian dengan alur "akun dibuat admin" | Admin buat akun + set password awal, user bisa ganti sendiri | Admin buat akun, user selalu login lewat email — cocok untuk pemakaian jarang, kurang cocok untuk approval harian |

Karena aplikasi ini dipakai rutin (approval bertingkat harian oleh Manajer/VP/Direksi) dan akun disediakan admin (bukan self-signup publik), email/password lebih praktis. Magic link bisa ditambahkan belakangan sebagai opsi tambahan (bukan pengganti) jika dibutuhkan — tidak saling eksklusif secara teknis dengan Supabase Auth.

### Implementasi

- `actions/auth.ts` — Server Action `login(formData)` (memanggil `supabase.auth.signInWithPassword`, redirect ke `/login?error=...` jika gagal) dan `logout()`.
- `app/login/page.tsx` — halaman login sederhana, menampilkan pesan error dari query param.
- Role disimpan di tabel `user_roles` (lihat §3), **bukan** tabel `profiles` — dibaca lewat `lib/supabase/role.ts`:
  - `getCurrentUserRole()` — role user saat ini atau `null` jika belum login/belum ada baris role.
  - `requireRole(...allowed)` — dipakai di awal Server Action/Server Component yang dibatasi role tertentu, `throw` jika tidak berwenang. Proteksi ini di level server (Server Action & RLS), bukan cuma disembunyikan di UI — sesuai catatan keamanan di PANDUAN.md Prompt 4.3.
- `proxy.ts` (lewat `lib/supabase/middleware.ts`) — auth-gate global: user belum login yang mengakses route apapun selain `/login` di-redirect ke `/login`; user yang sudah login mengakses `/login` di-redirect ke `/`.
- **Penambahan user baru** (sementara, sampai ada UI admin khusus): dilakukan manual oleh admin lewat Supabase Dashboard —
  1. **Authentication → Users → Add user**, isi email + password awal, kirim tahu user secara terpisah (misal chat internal) supaya user bisa login lalu ganti password sendiri (Supabase punya alur "forgot password" bawaan bila diperlukan).
  2. **Table Editor → `user_roles` → Insert row**, isi `user_id` (disalin dari user yang baru dibuat di langkah 1), `role` (evaluator/manajer/vp/direksi/admin), dan `full_name` (nama lengkap — dipakai untuk menampilkan "disetujui oleh: ..." dan tanda tangan PDF, lihat §6).
  UI admin untuk kedua langkah ini bisa dibangun belakangan sebagai form khusus jika volume user besar — tidak masuk cakupan tahap 0.3.

---

## 5. Konvensi

- Bahasa UI & pesan validasi: Indonesia (mengikuti konten form asli).
- Server Actions dipakai untuk semua mutasi (create/update submission, approval), bukan API routes, kecuali endpoint yang perlu dipanggil non-Next.js (mis. `pdf/route.ts`).
- Validasi input dengan Zod, schema per form disimpan di `lib/forms/<slug>/schema.ts`.
- Commit per tahap PROGRESS.md, pesan commit menyebut nomor tahap eksplisit.
- Project di-scaffold dengan Next.js 16: konvensi file `middleware.ts` sudah dideprecate, diganti `proxy.ts` (fungsi diekspor bernama `proxy`, bukan `middleware`). `next.config.ts` set `turbopack.root` eksplisit karena folder ini bertetangga dengan project lain yang punya `package-lock.json` sendiri (menghindari Next.js salah menebak workspace root).

---

## 6. Keputusan Desain — Bagian D & Approval Bertingkat (tahap 4.1-4.3)

PANDUAN.md Prompt 4.1 menyebut "update status submission sesuai hasil [rekomendasi]", tapi enum `submission_status` (ditetapkan di tahap 0.2) tidak punya nilai untuk PRIORITAS A/B/PARKIR/TIDAK DILANJUTKAN — hanya status alur approval. Ambiguitas ini diselesaikan sebagai berikut, supaya sesi mendatang tidak mengubah `status` enum tanpa sadar akan konsekuensinya:

- **Rekomendasi bukan status tersendiri.** `getRekomendasi(totalSkor)` (`lib/forms/seleksi-investasi/utils.ts`) adalah fungsi murni dari `total_skor` — dihitung ulang kapan saja dibutuhkan (halaman Bagian D, detail submission, nanti PDF), tidak disimpan sebagai kolom terpisah. Snapshot teks rekomendasi tetap disimpan di `data.bagianD.rekomendasi` saat finalisasi (audit trail), tapi bukan sumber kebenaran untuk logika.
- **Approval bertingkat tetap berjalan penuh (manajer→VP→direksi) berapa pun skornya**, termasuk PARKIR/TIDAK DILANJUTKAN. Hanya Bagian B (gate) yang punya kuasa auto-stop sungguhan. Rekomendasi bersifat informatif untuk approver, bukan pemutus otomatis — sejalan dengan alur `4.3` yang tidak menyebut percabangan berdasar rekomendasi sama sekali.
- **"PARKIR - evaluasi ulang maksimal 1 kali"** disebut di teks rekomendasi (persis dari PANDUAN.md) tapi mekanisme *counter* evaluasi ulang **tidak diimplementasikan** — tidak ada field/skema untuk itu di tahap 0.2, dan PANDUAN tidak merinci alur revisinya. Dianggap di luar cakupan sampai ada spesifikasi lebih lanjut.
- **Status "menunggu keputusan evaluator" (hentikan/teruskan) bukan nilai enum baru.** Diturunkan dari kombinasi `submission.status = 'menunggu_<tingkat>'` DAN `approval_chain[<tingkat>].status = 'ditolak'`. Begitu evaluator memutuskan, salah satu nilai berubah (status maju ke tingkat berikutnya, atau jadi `ditolak` final) sehingga kombinasi ini otomatis tidak berlaku lagi. Logika ini ada di dua tempat yang harus tetap konsisten: `components/forms/seleksi-investasi/ApprovalActions.tsx` (tampilan) dan `app/dashboard/page.tsx` (indikator "perlu keputusan Anda").
- ~~Nama approver tidak ditampilkan~~ — **selesai**: kolom `full_name` ditambahkan ke `user_roles` (migration `20260709120001`, diisi manual oleh admin lewat Table Editor saat menambah user, §4). RLS `user_roles` diperluas jadi "siapapun yang login boleh baca nama+role siapapun" (migration `20260709120003`) — perlu, karena evaluator/approver lain harus bisa lihat siapa yang memutuskan; internal app, nama+role dianggap bukan data sensitif antar pegawai. Halaman detail submission (`app/forms/seleksi-investasi/[submissionId]/page.tsx`) sudah menampilkan nama approver dari tabel ini.
- RLS `approval_chain` awalnya hanya mengizinkan approver meng-update baris tingkatnya sendiri; ditambah policy baru supaya **evaluator** juga bisa update baris berstatus `ditolak` milik submission-nya sendiri (untuk set `diteruskan_meski_ditolak=true` saat memilih "teruskan") — lihat migration `20260709120003_rls_policies.sql`.

## 7. PDF Export (tahap 5.1)

**Pilihan: `@react-pdf/renderer`** (bukan `puppeteer`).

| | `@react-pdf/renderer` | `puppeteer` |
|---|---|---|
| Kompatibilitas Vercel serverless | Pure JS, tidak butuh binary tambahan, ringan | Butuh Chromium penuh; perlu paket khusus (`@sparticuz/chromium` dkk) agar muat di batas ukuran function serverless, lebih rentan cold-start lambat/timeout |
| Cara layout | API sendiri (`View`/`Text`/`StyleSheet`, flexbox via Yoga) — bukan HTML/CSS asli | HTML+CSS biasa (bisa reuse styling web), tapi butuh render halaman nyata dulu |
| Cocok untuk kebutuhan ini | Layout form terstruktur (tabel, area tanda tangan) — cukup dengan primitif View/Text, tidak butuh HTML kompleks | Berlebihan untuk kebutuhan ini, menambah risiko deployment |

Kriteria penentu utama (sesuai PANDUAN.md): "pilih yang lebih ringan untuk di-deploy di Vercel". `@react-pdf/renderer` menang karena tidak ada risiko ukuran/cold-start Chromium di serverless, dan layout yang dibutuhkan (tabel skoring, blok identitas, 4 kotak tanda tangan) sepenuhnya bisa dibangun dengan primitif `View`/`Text`-nya tanpa perlu HTML/CSS penuh.

**Implementasi:** `lib/forms/seleksi-investasi/pdf/SubmissionPdf.tsx` (template, komponen React memakai primitif `@react-pdf/renderer` — BUKAN JSX/HTML biasa) dirender lewat `app/forms/seleksi-investasi/[submissionId]/pdf/route.ts` (Route Handler, `renderToBuffer`, `Content-Type: application/pdf`). Tombol "Download PDF" di halaman detail submission (`[submissionId]/page.tsx`) membuka route ini di tab baru.

**Verifikasi tanpa Supabase asli:** route ini butuh data submission sungguhan sehingga tidak bisa dites lewat browser (di-gate auth + butuh DB). Sebagai gantinya, `SubmissionPdf` diuji langsung dengan `renderToBuffer` + data mock lewat `tsx` (dijalankan lalu dihapus, bukan bagian dari kode aplikasi) untuk dua skenario: (1) proposal lengkap Bagian A-D dengan approval_chain berisi kasus "ditolak lalu diteruskan" — hasil valid PDF 7.696 bytes; (2) proposal gagal gate (hanya Bagian A-B, tanpa C/D) — hasil valid PDF 4.945 bytes, membuktikan rendering kondisional per bagian tidak crash saat data sebagian kosong. Kedua kali menghasilkan file dengan magic bytes `%PDF-1.3` yang valid.

## 8. Keputusan Tertunda

- ~~Isi rubrik skoring (tahap 3.2) belum ditempel user~~ — sudah diberikan (`Rubik.xlsx`), dicatat lengkap di [PANDUAN.md](PANDUAN.md#prompt-32--rubrik-skoring-sebagai-referensi).
- Tidak ada lagi keputusan tertunda untuk fitur inti form seleksi investasi — sisa tahap adalah testing end-to-end (5.2) dan deploy (5.3), keduanya butuh project Supabase asli untuk benar-benar dijalankan.

Detail field Bagian A-D, teks 6 kriteria gate, 8 kriteria skoring+bobot, dan 4 ambang batas rekomendasi **sudah lengkap** di [PANDUAN.md](PANDUAN.md) — tidak perlu digali ulang ke user saat mengerjakan tahap 1.1/2.1/3.1/4.1, cukup ikuti isi dokumen tersebut persis.
