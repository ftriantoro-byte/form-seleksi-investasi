Saya ingin menggabungkan modul manajemen proyek (mirip ClickUp — Task, List,
Board, Calendar, Docs kolaboratif, dst) ke dalam aplikasi form internal
perusahaan yang sudah ada di folder ini (D:\PROYEK\form-seleksi-investasi).
Ini BUKAN proyek baru — satu aplikasi Next.js yang sama, sudah live di
https://form-seleksi-investasi.vercel.app, sudah punya modul form berjalan
("Seleksi Investasi"), dan sekarang akan ditambah modul KEDUA yang berbeda
sifatnya: bukan form/approval, tapi manajemen proyek/tugas sehari-hari,
dipakai cuma oleh ±3 orang (bukan semua staf yang pakai modul form).

Sebelum mulai coding:

1. Baca PROGRESS.md, ARCHITECTURE.md, PANDUAN.md, dan AGENTS.md di root
   project. **AGENTS.md penting** — project ini pakai Next.js versi yang
   API-nya berbeda dari training data model manapun, baca dokumentasi di
   node_modules/next/dist/docs/ untuk versi yang sungguhan dipakai sebelum
   menulis kode apa pun yang menyentuh routing/Server Actions.

2. Baca PM-MODULE-SPEC.md di root project ini — itu daftar LENGKAP fitur
   dan rancangan skema data untuk modul PM yang mau dibangun. Dokumen itu
   sumber kebenaran untuk "apa yang dibangun". Prompt ini cuma soal
   "bagaimana cara mulai" dan aturan main.

3. Skema database modul form yang sudah ada (forms + submissions sebagai
   JSONB) **TIDAK COCOK dipakai untuk data manajemen proyek** — Task/List/
   Board butuh query, filter, dan relasi yang jauh lebih berat daripada
   satu dokumen form yang ditulis lalu di-approve. Modul PM ini pakai
   TABEL RELASIONAL SENDIRI, semua dengan prefix `pm_` (lihat
   PM-MODULE-SPEC.md §2), hidup berdampingan di database Supabase yang
   SAMA, tapi terpisah jelas secara skema dari `forms`/`submissions`/
   `approval_chain`/`submission_history` milik modul form.

4. Akses modul PM DIBATASI, bukan untuk semua user form-seleksi-investasi.
   Cuma ±3 orang yang di-grant lewat tabel baru `pm_members` (lihat
   PM-MODULE-SPEC.md §1) yang bisa lihat menu & data modul PM sama sekali
   — dicek di level Server Action, bukan cuma disembunyikan di UI.

5. UI HARUS konsisten dengan aplikasi yang sudah ada — pakai ulang
   komponen di components/ui/ (FormPageShell, FormPageHeader, dst) dan
   pola dashboard yang sudah ada, alih-alih bikin gaya baru. Ikuti
   estetika yang sudah ditetapkan: minimal, banyak ruang kosong, shadow
   lembut, sudut membulat, palet warna zinc + aksen lembut (lihat
   app/globals.css). Kalau modul PM butuh komponen yang belum ada di
   components/ui/ (mis. Kanban card, Gantt bar), buat baru TAPI ikuti
   bahasa desain yang sama, taruh di components/pm/ (folder terpisah dari
   components/forms/ milik modul form, supaya jelas mana milik modul apa).

6. JANGAN ubah kode, tabel, RLS policy, atau data modul form Seleksi
   Investasi yang sudah ada kecuali memang saya minta secara eksplisit.
   Kalau modul PM butuh nav/link baru di dashboard utama (app/dashboard/
   page.tsx), itu boleh — cuma nambah entri, bukan restrukturisasi
   halaman yang sudah ada.

7. Real-time (update Task langsung, kolaborasi Docs/Notulensi Meeting)
   pakai Supabase Realtime (Postgres Changes + Broadcast) — BUKAN
   Socket.IO. Lihat PM-MODULE-SPEC.md §5 untuk pola persisnya.

8. Deploy tetap ke repo & project Vercel yang sama (push ke
   github.com/ftriantoro-byte/form-seleksi-investasi → Vercel auto-deploy)
   — tidak perlu setup project/env var baru, kecuali memang ada kebutuhan
   spesifik (mis. bucket Supabase Storage terpisah untuk attachment PM) —
   kalau ada, sebutkan dan diskusikan dulu, jangan langsung buat.

9. Ikuti alur kerja yang sama seperti modul form pertama: tambahkan
   section checklist baru di PROGRESS.md untuk modul PM ini (isinya daftar
   Fase A-D dari PM-MODULE-SPEC.md §3), kerjakan satu tahap per giliran,
   commit per tahap dengan pesan jelas, dan **tampilkan dulu rencana
   skema database (nama tabel, kolom, relasi, RLS policy) untuk saya
   konfirmasi sebelum mulai bikin migration/coding** — jangan langsung
   eksekusi dari spec, karena ini perubahan besar yang menyentuh database
   produksi yang sudah dipakai form Seleksi Investasi.

10. Tiap tahap selesai: test benar-benar jalan (bukan cuma lolos test
    otomatis) — coba manual di browser sungguhan terhadap Supabase asli,
    DAN pastikan modul form Seleksi Investasi yang sudah ada tetap
    berfungsi normal tanpa regresi, baru update checklist + commit.
