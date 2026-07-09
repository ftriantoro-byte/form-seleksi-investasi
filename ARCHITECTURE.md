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
| PDF export | **Belum diputuskan** — akan dibandingkan di tahap 5.1 (lihat §6) | Perlu layout mengikuti form Excel asli + area tanda tangan 4 pihak |
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
├── middleware.ts                      # proteksi route + refresh session Supabase
└── supabase/
    └── migrations/                    # SQL migration, sumber kebenaran skema DB
```

Prinsip: setiap form baru di masa depan cukup menambah folder di `app/forms/<slug>`, `components/forms/<slug>`, dan `lib/forms/<slug>` — tanpa mengubah skema database inti.

---

## 3. Skema Database

Skema di bawah persis mengikuti spesifikasi di [PANDUAN.md](PANDUAN.md) Prompt 0.2 — nama kolom sengaja dalam Bahasa Indonesia agar konsisten dengan istilah form Excel asli (status, nama field) yang dipakai user & approver.

### `user_roles`
Role aplikasi per user, terpisah dari `auth.users` bawaan Supabase (tidak ada tabel `profiles` — nama tampilan diambil dari `auth.users.raw_user_meta_data`/email, bukan disimpan ulang).

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → auth.users(id), unique | satu role per user |
| role | enum: `evaluator`, `manajer`, `vp`, `direksi`, `admin` | |
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

- Supabase Auth (email/password, bisa ditambah magic link di kemudian hari — belum diputuskan).
- Role disimpan di `profiles.role`, di-set manual oleh admin (belum ada UI signup publik — akun dibuat/di-invite oleh admin, sesuai konteks aplikasi internal perusahaan).
- Middleware Next.js (`middleware.ts`) memproteksi semua route kecuali `/login`, mengarahkan ke `/login` jika belum autentikasi.

---

## 5. Konvensi

- Bahasa UI & pesan validasi: Indonesia (mengikuti konten form asli).
- Server Actions dipakai untuk semua mutasi (create/update submission, approval), bukan API routes, kecuali endpoint yang perlu dipanggil non-Next.js (mis. `pdf/route.ts`).
- Validasi input dengan Zod, schema per form disimpan di `lib/forms/<slug>/schema.ts`.
- Commit per tahap PROGRESS.md, pesan commit menyebut nomor tahap eksplisit.

---

## 6. Keputusan Tertunda

- **PDF export (tahap 5.1)**: perbandingan `react-pdf` vs `puppeteer` akan dilakukan saat tahap tersebut dikerjakan, kriteria utama: kemudahan meniru layout Excel asli + area tanda tangan 4 pihak, dan kompatibilitas dengan Vercel (serverless — `puppeteer` butuh perhatian ekstra karena ukuran Chromium di lingkungan serverless).
- **Isi rubrik skoring (tahap 3.2)**: teks deskripsi skor 1/3/5 per kriteria C1-C8 dari sheet "Rubrik Skoring" Excel asli **belum ditempel user** — lihat status di [PANDUAN.md](PANDUAN.md#prompt-32--rubrik-skoring-sebagai-referensi). Tahap 3.2 tidak bisa dikerjakan sampai teks ini diberikan; jangan diparafrase/dikarang ulang.
- **Struktur kolom tabel `scoring_rubrics`**: ditentukan final saat tahap 3.2, setelah tahu bentuk data rubrik yang sebenarnya.

Detail field Bagian A-D, teks 6 kriteria gate, 8 kriteria skoring+bobot, dan 4 ambang batas rekomendasi **sudah lengkap** di [PANDUAN.md](PANDUAN.md) — tidak perlu digali ulang ke user saat mengerjakan tahap 1.1/2.1/3.1/4.1, cukup ikuti isi dokumen tersebut persis.
