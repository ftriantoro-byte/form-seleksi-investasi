# Panduan Prompt Claude Code — Aplikasi Form Seleksi Awal Proposal Investasi
## Versi Final: Approval Bertingkat (Manajer → VP → Direksi)
### Berdasarkan: Form_Seleksi_Awal_Proposal_Investasi.xlsx

> Dokumen ini adalah spesifikasi sumber-kebenaran (source of truth) untuk detail per-tahap: nama field, teks kriteria gate, kriteria skoring + bobot, ambang batas rekomendasi, dan alur approval. `ARCHITECTURE.md` merangkum keputusan teknis; dokumen ini menyimpan teks & angka persis yang dipakai saat implementasi supaya tidak diparafrase ulang antar sesi.

---

## PENDAHULUAN

Dokumen ini adalah panduan lengkap dan berurutan untuk membangun aplikasi form seleksi awal proposal investasi, mereplikasi persis logika dari form Excel yang sudah dipakai perusahaan, dengan tambahan alur persetujuan bertingkat.

**Ringkasan aplikasi yang akan dibangun:**
- Form digital pengganti Excel untuk seleksi awal proposal investasi
- Logika **gate** (kriteria gugur) — 6 kriteria Ya/Tidak, satu "Tidak" saja langsung menghentikan proses
- Logika **skoring berbobot** — 8 kriteria dengan bobot tetap, skor 1-5, kalkulasi otomatis
- **Rekomendasi otomatis** berdasarkan total skor (Prioritas A/B, Parkir, Tidak Dilanjutkan)
- **Approval bertingkat 3 level**: Manajer → VP → Direksi (semua proposal wajib lewat ketiganya)
- Kalau satu tingkat menolak, **Evaluator memilih**: hentikan proses atau tetap teruskan ke tingkat berikutnya (catatan penolakan tetap terlihat untuk transparansi)
- **Direksi adalah tingkat final** — tidak ada eskalasi setelah itu
- Export PDF hasil evaluasi lengkap dengan jejak approval semua tingkat
- Dirancang sebagai **form pertama** dari kemungkinan beberapa form lain di masa depan (landing page menampung banyak form)

**Tech stack:**
- Frontend + Backend: **Next.js** (App Router, Server Actions) — satu aplikasi, tidak perlu backend terpisah
- Database & Auth: **Supabase**
- Styling: **Tailwind CSS**
- PDF export: ditentukan di tahap terkait (dibandingkan react-pdf vs puppeteer)
- Hosting: **Vercel**

---

## CARA PAKAI PANDUAN INI

1. Jalankan `claude` di terminal, di dalam folder proyek kosong.
2. **Mulai dengan Prompt 0** (sekali di awal) untuk membuat sistem pelacak progres.
3. Jalankan prompt secara berurutan, **satu per satu**, tunggu sampai selesai sebelum lanjut.
4. Kalau kuota/token habis di tengah jalan, di sesi baru gunakan **Prompt Lanjutan** — Claude Code akan membaca PROGRESS.md dan melanjutkan tanpa mengulang dari nol.
5. Untuk **Prompt 3.2 (Rubrik Skoring)**: saat sampai ke prompt ini, **sertakan ulang isi lengkap sheet "Rubrik Skoring"** dari Excel aslimu ke Claude Code (copy-paste langsung) — jangan biarkan dia menulis ulang dengan bahasa sendiri, karena teks ini biasanya sudah divalidasi tim GCG/manajemen risiko perusahaan.

---

## PROMPT LANJUTAN
*(Gunakan ini di AWAL setiap sesi baru, termasuk setelah kuota habis/terputus)*

```
Ini adalah kelanjutan dari proyek yang sedang dibangun. Sebelum melakukan apapun:

1. Baca file PROGRESS.md dan ARCHITECTURE.md di root proyek.
2. Periksa struktur folder dan git log untuk memastikan pemahamanmu soal apa yang sudah selesai sesuai isi PROGRESS.md.
3. Laporkan ke saya: tahap mana yang terakhir selesai, dan tahap apa yang seharusnya dikerjakan berikutnya.
4. Setelah saya konfirmasi, lanjutkan mengerjakan tahap berikutnya mengikuti keputusan arsitektur yang sudah tercatat di ARCHITECTURE.md (jangan mengubah tech stack atau struktur yang sudah ditetapkan kecuali saya minta).
5. Setelah tahap tersebut selesai dan sudah kamu tes, update checkbox-nya di PROGRESS.md menjadi selesai, lalu buat git commit.
```

---

## PROMPT 0 — Setup Proyek & Struktur Multi-Form

```
Saya akan membangun aplikasi form seleksi investasi internal perusahaan, dengan kemungkinan beberapa form lain akan ditambahkan di masa depan (landing page akan memuat daftar form-form ini). Sebelum mulai coding:

1. Buat file PROGRESS.md berisi checklist semua tahap (daftar di bawah), dengan checkbox status.
2. Buat file ARCHITECTURE.md mencatat keputusan teknis: tech stack, struktur folder, skema database.
3. Inisialisasi project Next.js (App Router), install Supabase client.
4. Buat struktur folder yang mengantisipasi multi-form:
   - /app (landing page di root)
   - /app/forms/seleksi-investasi (form pertama ini)
   - Skema database dirancang generik: tabel "forms" (daftar jenis form), "submissions" (data submission apapun jenis formnya, simpan data spesifik sebagai JSON), bukan tabel khusus per form
5. Inisialisasi git repository, commit setelah setiap tahap.

Tech stack:
- Frontend + Backend: Next.js (App Router, Server Actions)
- Database & Auth: Supabase
- Styling: Tailwind CSS
- PDF export: akan ditentukan di tahap terkait (bandingkan react-pdf vs pdf-lib vs puppeteer, catat pilihan di ARCHITECTURE.md)

Role pengguna aplikasi ini: evaluator, manajer, vp, direksi, admin.

Daftar tahap (masukkan ke PROGRESS.md):

FASE SETUP:
[ ] 0.1 Setup project Next.js, Supabase, struktur folder multi-form
[ ] 0.2 Skema database (forms, submissions, approval_chain, submission_history, user_roles)
[ ] 0.3 Autentikasi Supabase (login, role: Evaluator/Manajer/VP/Direksi/Admin)
[ ] 0.4 Landing page dasar (daftar form, saat ini baru 1: Seleksi Investasi)

FORM SELEKSI INVESTASI - BAGIAN A (Identitas):
[ ] 1.1 Form input Bagian A: identitas proposal (10 field)

FORM SELEKSI INVESTASI - BAGIAN B (Gate):
[ ] 2.1 Form input Bagian B: 6 kriteria gugur (Ya/Tidak + bukti/catatan)
[ ] 2.2 Logika auto-stop: jika ada 1 "Tidak", submission otomatis TIDAK DILANJUTKAN, skip Bagian C

FORM SELEKSI INVESTASI - BAGIAN C (Skoring):
[ ] 3.1 Form input Bagian C: 8 kriteria skoring (skor 1-5 + justifikasi), muncul HANYA jika lulus gate
[ ] 3.2 Tampilkan rubrik skoring (skor 1/3/5) sebagai referensi/tooltip saat isi tiap kriteria
[ ] 3.3 Kalkulasi otomatis: nilai tertimbang per kriteria (bobot x skor) dan total skor

FORM SELEKSI INVESTASI - BAGIAN D (Hasil & Approval Bertingkat):
[ ] 4.1 Logika rekomendasi otomatis berdasarkan total skor (4 ambang batas)
[ ] 4.2 Field catatan evaluator, pernyataan bebas benturan kepentingan
[ ] 4.3 Alur approval bertingkat: Manajer -> VP -> Direksi, dengan opsi hentikan/teruskan jika ditolak
[ ] 4.4 Dashboard/riwayat submission (list semua proposal, beda tampilan per role)

EXPORT & FINALISASI:
[ ] 5.1 Export PDF hasil evaluasi (layout sesuai form Excel, area tanda tangan 4 pihak)
[ ] 5.2 Testing end-to-end alur lengkap
[ ] 5.3 Deploy ke Vercel

Setelah PROGRESS.md dan ARCHITECTURE.md dibuat, tampilkan ke saya untuk konfirmasi sebelum lanjut ke tahap coding pertama.
```

---

## PROMPT 0.2 — Skema Database dengan Approval Bertingkat

```
Kerjakan tahap 0.2 dari PROGRESS.md: Skema database.

Buat skema Supabase (SQL) dengan tabel:

1. "forms" — daftar jenis form
   - id, slug (misal "seleksi-investasi"), nama, deskripsi, aktif (boolean)

2. "submissions" — universal untuk semua jenis form
   - id, form_id (FK ke forms), dibuat_oleh (FK ke users), status, data (JSONB - seluruh isi Bagian A-D), total_skor (numeric, nullable), tingkat_approval_saat_ini (enum: manajer/vp/direksi/selesai, nullable), dibuat_pada, diupdate_pada

   Status yang mungkin: draft, menunggu_skoring, tidak_lulus_gate, menunggu_manajer, menunggu_vp, menunggu_direksi, disetujui, ditolak

3. "approval_chain" — mencatat keputusan tiap tingkat per submission
   - id, submission_id (FK), tingkat (enum: manajer, vp, direksi), status (enum: menunggu, disetujui, ditolak), approver_user_id (FK, nullable sampai diisi), catatan (text), diteruskan_meski_ditolak (boolean, default false), diputuskan_pada (timestamp, nullable)

   Saat submission lulus gate + skoring, otomatis buat 3 baris di tabel ini (tingkat manajer/vp/direksi, semua berstatus "menunggu") sebagai kerangka alur.

4. "submission_history" — audit trail lengkap
   - id, submission_id, status_lama, status_baru, diubah_oleh, catatan, timestamp

5. Supabase Auth + tabel "user_roles":
   - user_id, role (enum: evaluator, manajer, vp, direksi, admin)

Terapkan Row Level Security (RLS):
- Evaluator: lihat submission miliknya sendiri
- Manajer: lihat submission berstatus "menunggu_manajer" ATAU yang sudah pernah mereka putuskan
- VP: lihat submission berstatus "menunggu_vp" ATAU yang sudah pernah mereka putuskan (termasuk histori tingkat manajer sebelumnya untuk konteks)
- Direksi: sama seperti VP tapi untuk tingkat direksi
- Admin: lihat semua

Catat skema final ini di ARCHITECTURE.md, termasuk diagram alur status submission secara teks.

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 0.1 — (Bagian dari Prompt 0, sudah otomatis dikerjakan)
*(Tidak perlu prompt terpisah — sudah tercakup dalam eksekusi Prompt 0 di atas. Lanjut ke 0.3.)*

---

## PROMPT 0.3 — Autentikasi & Role

```
Kerjakan tahap 0.3 dari PROGRESS.md: Autentikasi Supabase.

- Setup Supabase Auth untuk login (email/password, atau magic link jika lebih sesuai untuk pengguna internal perusahaan - jelaskan trade-off keduanya dan sarankan yang menurutmu lebih cocok)
- Buat halaman login sederhana
- Buat middleware/helper untuk mengecek role user (evaluator/manajer/vp/direksi/admin) dari tabel user_roles, dipakai untuk proteksi halaman dan Server Action selanjutnya
- Untuk sekarang, buat cara admin menambahkan user baru beserta role-nya secara manual (lewat Supabase dashboard cukup, belum perlu UI khusus)

Catat pendekatan autentikasi ini di ARCHITECTURE.md.

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 0.4 — Landing Page

```
Kerjakan tahap 0.4 dari PROGRESS.md: Landing page dasar.

Buat halaman utama (/) yang menampilkan daftar form yang tersedia, diambil dari tabel "forms" di database. Untuk sekarang baru ada 1 form: "Seleksi Awal Proposal Investasi", tampilkan sebagai kartu/tombol yang mengarah ke /forms/seleksi-investasi.

Buat juga halaman ini menampilkan ringkasan singkat untuk user yang login (misal jumlah submission yang perlu tindakan mereka, kalau ada).

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 1.1 — Form Bagian A (Identitas Proposal)

```
Kerjakan tahap 1.1 dari PROGRESS.md: Form input Bagian A - Identitas Proposal.

Buat halaman form di /app/forms/seleksi-investasi/baru dengan field persis berikut (sesuai form Excel asli):

1. Nomor registrasi proposal (text, auto-generate format bebas tapi bisa diedit, misal "PRP-2026-001")
2. Tanggal proposal diterima (date picker)
3. Nama proyek / judul proposal (text)
4. Lokasi proyek (text)
5. Nama pengusul / calon mitra (text)
6. Sumber proposal (dropdown: "Business Development", "Disposisi Manajemen", "Pemegang Saham", "Lainnya")
7. Skema kerjasama yang diusulkan (text)
8. Estimasi nilai investasi dalam Rupiah (number, format currency, pemisah ribuan)
9. Evaluator / PIC (auto-isi dari user yang login, bisa diedit)
10. Target selesai seleksi awal (date picker, default H+5 hari kerja dari tanggal proposal diterima)

Simpan sebagai submission berstatus "draft" dengan form_id merujuk ke "seleksi-investasi". Setelah submit Bagian A, redirect ke Bagian B untuk submission yang sama.

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 2.1 — Form Bagian B (Kriteria Gugur / Gate)

```
Kerjakan tahap 2.1 dari PROGRESS.md: Form Bagian B - Kriteria Gugur.

Buat halaman lanjutan form (submission yang sama dari Bagian A) menampilkan 6 kriteria gate berikut, masing-masing dengan pilihan Ya/Tidak dan field teks untuk bukti/catatan:

G1: Kelengkapan dokumen minimum (profil & legalitas pengusul, deskripsi proyek, bukti penguasaan/status lahan-aset, indikasi angka finansial)
G2: Kesesuaian dengan core business, RJPP/RKAP, dan arah portofolio perusahaan
G3: Status hukum lahan/aset jelas dan bebas indikasi sengketa
G4: Skema kerjasama diperbolehkan bagi BUMN sesuai regulasi & anggaran dasar
G5: Calon mitra tidak masuk daftar hitam, tidak pailit/PKPU, tidak ada benturan kepentingan
G6: Peruntukan tata ruang lokasi tidak bertentangan dengan rencana proyek (KKPR/RTRW)

Tampilkan status gate real-time saat form diisi (badge "Lulus Gate" hijau atau "Tidak Lulus" merah, update begitu ada satu jawaban "Tidak").

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 2.2 — Logika Auto-Stop Gate

```
Kerjakan tahap 2.2 dari PROGRESS.md: Logika auto-stop gate.

Implementasikan logika berikut saat Bagian B disubmit:
- Jika SEMUA 6 kriteria gate dijawab "Ya" -> status submission jadi "menunggu_skoring", lanjut ke Bagian C
- Jika ADA MINIMAL SATU jawaban "Tidak" -> status submission langsung jadi "tidak_lulus_gate", proses BERHENTI total, TIDAK lanjut ke Bagian C
- Catat perubahan status ini di submission_history
- Tampilkan halaman hasil yang jelas kalau submission gagal gate: status "TIDAK DILANJUTKAN", tampilkan kriteria mana saja yang gagal beserta catatannya

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 3.1 — Form Bagian C (Skoring Berbobot)

```
Kerjakan tahap 3.1 dari PROGRESS.md: Form Bagian C - Skoring Berbobot.

Halaman ini HANYA bisa diakses jika submission berstatus "menunggu_skoring" (lulus gate). Tampilkan 8 kriteria berikut, masing-masing dengan input skor 1-5 (slider atau radio button) dan field teks untuk justifikasi & sumber data:

C1: Kesesuaian strategis (strategic fit) dengan RJPP, core business & portofolio - bobot 0.15
C2: Potensi pasar & permintaan - bobot 0.20
C3: Indikasi kelayakan finansial - bobot 0.20
C4: Kredibilitas & kapasitas calon mitra - bobot 0.15
C5: Kesiapan lahan & perizinan - bobot 0.10
C6: Profil risiko awal & ketersediaan mitigasi - bobot 0.10
C7: Kebutuhan sumber daya & kompleksitas eksekusi - bobot 0.05
C8: Nilai strategis non-finansial (sinergi grup/BUMN, ESG, dampak sosial) - bobot 0.05

Tampilkan bobot di sebelah tiap kriteria (read-only, tidak bisa diedit user).

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 3.2 — Rubrik Skoring sebagai Referensi

```
Kerjakan tahap 3.2 dari PROGRESS.md: Tampilkan rubrik skoring sebagai referensi.

Untuk tiap kriteria C1-C8 di form Bagian C, tambahkan tombol/ikon info (?) yang saat diklik/hover menampilkan rubrik penilaian dari sheet "Rubrik Skoring" pada Excel asli: deskripsi kondisi untuk skor 1 (buruk), skor 3 (cukup), skor 5 (sangat baik), beserta "validasi minimum/sumber data yang diperiksa".

Simpan rubrik ini sebagai data terstruktur (tabel database "scoring_rubrics"), JANGAN hardcode teks panjang di komponen UI, supaya bisa diedit admin nanti tanpa ubah kode.

Isi rubrik lengkap untuk tiap kriteria: [TEMPEL DI SINI ISI LENGKAP SHEET "RUBRIK SKORING" DARI EXCEL ASLIMU]

Setelah selesai, update PROGRESS.md dan commit.
```

**⚠️ PENTING:** sebelum menjalankan prompt di atas, ganti bagian `[TEMPEL DI SINI...]` dengan copy-paste isi lengkap sheet "Rubrik Skoring" dari file Excel-mu, supaya teksnya persis sama dan tidak ditulis ulang oleh Claude Code dengan bahasanya sendiri.

**Status: BELUM TERSEDIA** — isi sheet "Rubrik Skoring" belum ditempel oleh user. Tahap 3.2 tidak bisa dikerjakan sampai teks ini diberikan.

---

## PROMPT 3.3 — Kalkulasi Skor Otomatis

```
Kerjakan tahap 3.3 dari PROGRESS.md: Kalkulasi skor otomatis.

Implementasikan:
- Nilai tertimbang per kriteria = bobot x skor (tampilkan real-time saat evaluator mengisi skor)
- Total skor tertimbang = jumlah seluruh nilai tertimbang (maksimal 5.00 jika semua skor 5)
- Tampilkan total skor jelas di bagian bawah form, update otomatis tiap ada perubahan skor

Simpan total_skor ini ke kolom "total_skor" di tabel submissions saat form disubmit.

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 4.1 — Logika Rekomendasi Otomatis

```
Kerjakan tahap 4.1 dari PROGRESS.md: Logika rekomendasi otomatis.

Berdasarkan total_skor dari tahap 3.3, terapkan aturan keputusan berikut:

- Skor >= 4.00 -> "PRIORITAS A - lanjut studi kelayakan penuh"
- Skor 3.00 - 3.99 -> "PRIORITAS B - lanjut dengan catatan perbaikan/klarifikasi"
- Skor 2.00 - 2.99 -> "PARKIR - minta perbaikan proposal, evaluasi ulang maksimal 1 kali"
- Skor < 2.00 -> "TIDAK DILANJUTKAN"

Update status submission sesuai hasil ini, tampilkan rekomendasi ini dengan jelas di halaman hasil (Bagian D), dengan warna/badge yang membedakan tiap kategori.

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 4.2 — Field Tambahan Bagian D

```
Kerjakan tahap 4.2 dari PROGRESS.md: Field tambahan Bagian D.

Tambahkan ke halaman hasil (Bagian D):
- Field teks: "Catatan evaluator / risiko utama yang perlu didalami"
- Field: "Pernyataan evaluator bebas benturan kepentingan" (Ya/Tidak, wajib diisi sebelum submission bisa difinalisasi, sertakan nama evaluator otomatis dari user yang login sebagai paraf digital)

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 4.3 — Alur Approval Bertingkat (Manajer → VP → Direksi)

```
Kerjakan tahap 4.3 dari PROGRESS.md: Alur approval bertingkat.

Implementasikan alur berikut:

1. Evaluator menyelesaikan Bagian A-D (termasuk pernyataan bebas benturan kepentingan) dan submit -> status submission jadi "menunggu_manajer", baris approval_chain tingkat "manajer" siap diisi.

2. TINGKAT MANAJER:
   - User role "manajer" melihat submission ini di dashboard mereka (status "menunggu_manajer")
   - Manajer membuka detail (read-only untuk isian evaluator), memberi keputusan: Setuju atau Tolak, beserta catatan wajib
   - SETUJU -> status jadi "menunggu_vp", approval_chain tingkat manajer jadi "disetujui"
   - TOLAK -> approval_chain tingkat manajer jadi "ditolak" dengan catatan. Proses TIDAK langsung berhenti. Sistem menampilkan pilihan ke Evaluator:
     a) "Hentikan proses" -> status submission jadi "ditolak" (final)
     b) "Tetap teruskan ke VP" -> status tetap lanjut jadi "menunggu_vp", set diteruskan_meski_ditolak = true di baris approval_chain manajer, catatan penolakan tetap ditampilkan ke VP sebagai konteks

3. TINGKAT VP: Ulangi pola yang sama persis seperti Manajer:
   - VP melihat submission berstatus "menunggu_vp", termasuk catatan dari tingkat Manajer sebelumnya (setuju maupun ditolak-tapi-diteruskan)
   - Setuju -> lanjut ke "menunggu_direksi"
   - Tolak -> Evaluator diberi pilihan sama: hentikan atau teruskan ke Direksi meski ditolak VP

4. TINGKAT DIREKSI (final, tidak ada eskalasi setelahnya):
   - Direksi melihat submission berstatus "menunggu_direksi", lengkap dengan seluruh riwayat keputusan Manajer dan VP sebelumnya
   - Direksi memberi keputusan: Setuju atau Tolak, beserta catatan
   - Keputusan Direksi SELALU FINAL -> status langsung jadi "disetujui" atau "ditolak", tidak ada opsi "teruskan" lagi

5. Setiap perubahan status WAJIB dicatat ke submission_history (siapa, kapan, keputusan apa, apakah ada eskalasi meski ditolak).

6. Proteksi akses: hanya role yang sesuai (manajer/vp/direksi) yang bisa memutuskan di tingkat masing-masing, ditegakkan di level Server Action/RLS Supabase, bukan hanya disembunyikan di UI.

7. Beri notifikasi (badge/counter di dashboard cukup, belum perlu email) ke Evaluator setiap kali ada tingkat yang menolak, supaya mereka tahu harus memilih hentikan/teruskan.

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 4.4 — Dashboard Riwayat Submission (per Role)

```
Kerjakan tahap 4.4 dari PROGRESS.md: Dashboard riwayat submission.

Buat halaman dashboard menampilkan daftar submission dalam tabel:
- Kolom: No. registrasi, Nama proyek, Tanggal diterima, Evaluator, Status, Tingkat approval saat ini, Total skor (jika ada), Aksi (lihat detail)
- Filter berdasarkan status
- Tampilan berbeda sesuai role:
  - Evaluator: submission miliknya sendiri, dengan indikator mencolok kalau ada tingkat yang menolak dan menunggu keputusan mereka (hentikan/teruskan)
  - Manajer: tab "Menunggu Keputusan Saya" (status menunggu_manajer) dan tab "Riwayat" (yang pernah mereka putuskan)
  - VP: sama seperti Manajer tapi untuk status menunggu_vp
  - Direksi: sama seperti Manajer tapi untuk status menunggu_direksi
  - Admin: lihat semua

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 5.1 — Export PDF

```
Kerjakan tahap 5.1 dari PROGRESS.md: Export PDF hasil evaluasi.

Buat fungsi export PDF untuk satu submission, layout merefleksikan struktur form asli:
- Header: judul form, nomor registrasi, tanggal
- Bagian A: identitas proposal (tabel)
- Bagian B: 6 kriteria gate dengan jawaban Ya/Tidak dan status gate keseluruhan
- Bagian C (jika lulus gate): tabel 8 kriteria dengan bobot, skor, nilai tertimbang, total skor di baris akhir
- Bagian D: rekomendasi otomatis, catatan evaluator, pernyataan benturan kepentingan
- Area tanda tangan 4 pihak berurutan:
  - Evaluator (nama, tanda tangan/paraf digital, tanggal submit)
  - Manajer (nama, keputusan Setuju/Tolak, catatan, tanggal)
  - VP (nama, keputusan Setuju/Tolak, catatan, tanggal)
  - Direksi (nama, keputusan FINAL Setuju/Tolak, catatan, tanggal)
- Jika ada tingkat yang sempat menolak tapi diteruskan, tampilkan catatan itu jelas di PDF (misal label "Ditolak di tingkat ini, diteruskan atas permintaan Evaluator") untuk transparansi audit

Bandingkan react-pdf vs puppeteer untuk kebutuhan ini, pilih yang lebih ringan untuk di-deploy di Vercel (puppeteer bisa berat untuk serverless). Catat pilihan dan alasannya di ARCHITECTURE.md.

Tambahkan tombol "Download PDF" / "Print" di halaman detail submission.

Setelah selesai, update PROGRESS.md dan commit.
```

---

## PROMPT 5.2 — Testing End-to-End

```
Kerjakan tahap 5.2 dari PROGRESS.md: Testing end-to-end.

Uji alur lengkap:
1. Buat submission baru sebagai Evaluator, isi Bagian A
2. Isi Bagian B dengan semua "Ya" -> pastikan lanjut ke Bagian C
3. Isi Bagian B dengan salah satu "Tidak" (submission baru untuk tes ini) -> pastikan langsung "TIDAK DILANJUTKAN", tidak bisa akses Bagian C
4. Isi Bagian C dengan berbagai kombinasi skor -> pastikan kalkulasi dan rekomendasi otomatis benar untuk keempat kategori
5. Submit sebagai Evaluator -> login sebagai Manajer -> setujui -> pastikan lanjut ke VP
6. Uji skenario Manajer menolak -> pastikan Evaluator dapat pilihan hentikan/teruskan, keduanya berfungsi benar
7. Ulangi pola serupa di tingkat VP
8. Login sebagai Direksi -> pastikan bisa lihat riwayat lengkap Manajer & VP, keputusan Direksi final (tidak ada opsi teruskan)
9. Export PDF -> cek layout, data, dan jejak approval 4 pihak tampil benar

Perbaiki bug yang ditemukan. Setelah semua lulus, update PROGRESS.md dan commit dengan tag "form-seleksi-investasi-selesai".
```

---

## PROMPT 5.3 — Deploy ke Vercel

```
Kerjakan tahap 5.3 dari PROGRESS.md: Deploy ke Vercel.

Siapkan semua yang dibutuhkan untuk deploy:
1. Pastikan environment variable Supabase (URL & anon key) dikonfigurasi lewat env var, tidak di-hardcode
2. Buat file .env.example untuk referensi
3. Tuliskan langkah-langkah lengkap yang harus saya lakukan di dashboard Vercel (hubungkan GitHub repo, masukkan environment variable, deploy) - saya awam soal ini, jelaskan sesederhana mungkin
4. Setelah saya deploy dan beri tahu URL-nya, bantu saya verifikasi aplikasi berjalan dengan benar

Catat langkah-langkah deployment ini di DEPLOYMENT.md sebagai dokumentasi untuk form-form berikutnya.

Setelah selesai, update PROGRESS.md dan commit final.
```

---

## CATATAN PENTING

- **Prompt 3.2 (Rubrik Skoring):** wajib tempel isi lengkap sheet "Rubrik Skoring" dari Excel asli sebelum menjalankan prompt ini — jangan biarkan Claude Code mengarang ulang.
- **Kepatuhan regulasi:** form ini mereferensikan UU BUMN, Permen BUMN, ISO 31000. Pastikan submission_history benar-benar tidak bisa diubah/dihapus user biasa — form asli menyebutkan eksplisit "seluruh form terisi diarsipkan sebagai dokumen tata kelola dan dapat diaudit".
- **Landing page multi-form:** form kedua/ketiga di masa depan mungkin butuh struktur approval berbeda dari yang bertingkat tetap ini. Komponen approval sudah dirancang cukup modular (tabel approval_chain generik), tapi jangan over-engineer sekarang — sesuaikan lagi kalau kebutuhan form berikutnya benar-benar berbeda.
