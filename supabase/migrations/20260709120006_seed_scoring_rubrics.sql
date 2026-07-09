-- Tahap 3.2: seed data rubrik skoring, persis dari sheet "Rubrik Skoring"
-- (Rubik.xlsx) — lihat PANDUAN.md Prompt 3.2 untuk sumbernya.

insert into scoring_rubrics (kriteria_kode, skor_level, deskripsi, validasi_minimum) values
('C1', 1, 'Di luar core business & tidak ada di RJPP/RKAP; tidak ada sinergi dengan portofolio', 'Bandingkan dengan dokumen RJPP & RKAP berjalan; konfirmasi arah portofolio ke manajemen strategi'),
('C1', 3, 'Terkait core business namun belum eksplisit di RJPP; sinergi terbatas', 'Bandingkan dengan dokumen RJPP & RKAP berjalan; konfirmasi arah portofolio ke manajemen strategi'),
('C1', 5, 'Sejalan penuh dengan RJPP/RKAP & strategi portofolio; memperkuat lini bisnis inti', 'Bandingkan dengan dokumen RJPP & RKAP berjalan; konfirmasi arah portofolio ke manajemen strategi'),

('C2', 1, 'Pasar jenuh/oversupply, tidak ada captive market, okupansi/TPK area rendah & menurun', 'Data TPK/okupansi BPS atau STR minimal 3 tahun; jumlah akomodasi & pipeline pesaing; kalender event/demand driver; uji silang asumsi okupansi-ADR pengusul vs data pasar aktual'),
('C2', 3, 'Permintaan ada namun kompetisi ketat; okupansi area moderat (mis. TPK 50-60%); captive market terbatas', 'Data TPK/okupansi BPS atau STR minimal 3 tahun; jumlah akomodasi & pipeline pesaing; kalender event/demand driver; uji silang asumsi okupansi-ADR pengusul vs data pasar aktual'),
('C2', 5, 'Captive market kuat & demand driver jelas; okupansi/TPK area tinggi & tren naik; pasokan baru terbatas', 'Data TPK/okupansi BPS atau STR minimal 3 tahun; jumlah akomodasi & pipeline pesaing; kalender event/demand driver; uji silang asumsi okupansi-ADR pengusul vs data pasar aktual'),

('C3', 1, 'IRR indikatif < WACC/hurdle rate; payback melebihi umur ekonomis/kerjasama; asumsi tidak wajar', 'Hitung ulang cepat (quick model) NPV/IRR/payback dengan asumsi konservatif; benchmark capex per m2/per kunci; bandingkan proyeksi revenue dgn data pasar; jangan hanya memakai angka pengusul'),
('C3', 3, 'IRR indikatif sekitar hurdle rate (selisih tipis); payback mendekati batas kebijakan; asumsi sebagian perlu validasi', 'Hitung ulang cepat (quick model) NPV/IRR/payback dengan asumsi konservatif; benchmark capex per m2/per kunci; bandingkan proyeksi revenue dgn data pasar; jangan hanya memakai angka pengusul'),
('C3', 5, 'IRR indikatif jelas di atas hurdle rate + buffer; payback nyaman di bawah batas; asumsi capex & revenue wajar vs benchmark', 'Hitung ulang cepat (quick model) NPV/IRR/payback dengan asumsi konservatif; benchmark capex per m2/per kunci; bandingkan proyeksi revenue dgn data pasar; jangan hanya memakai angka pengusul'),

('C4', 1, 'Tidak ada rekam jejak relevan; laporan keuangan tidak tersedia/lemah; reputasi bermasalah', 'Profil perusahaan & akta; laporan keuangan audited 2-3 tahun; cek media & putusan pengadilan (SIPP/direktori MA); cek daftar hitam LKPP; telusuri beneficial owner'),
('C4', 3, 'Rekam jejak terbatas namun ada; keuangan cukup dgn catatan; reputasi netral', 'Profil perusahaan & akta; laporan keuangan audited 2-3 tahun; cek media & putusan pengadilan (SIPP/direktori MA); cek daftar hitam LKPP; telusuri beneficial owner'),
('C4', 5, 'Rekam jejak proyek sejenis terbukti; keuangan sehat (audited); reputasi baik & struktur kepemilikan jelas', 'Profil perusahaan & akta; laporan keuangan audited 2-3 tahun; cek media & putusan pengadilan (SIPP/direktori MA); cek daftar hitam LKPP; telusuri beneficial owner'),

('C5', 1, 'Lahan belum dikuasai/sengketa; peruntukan tidak sesuai; jalur izin panjang & tidak pasti', 'Salinan sertifikat & cek ke ATR/BPN; KKPR/RTRW via OSS; identifikasi kebutuhan AMDAL/UKL-UPL & PBG serta estimasi waktunya'),
('C5', 3, 'Lahan dikuasai namun perizinan belum dimulai; peruntukan sesuai dgn syarat', 'Salinan sertifikat & cek ke ATR/BPN; KKPR/RTRW via OSS; identifikasi kebutuhan AMDAL/UKL-UPL & PBG serta estimasi waktunya'),
('C5', 5, 'Lahan clear & clean (sertifikat), KKPR sesuai, sebagian izin telah/hampir terbit', 'Salinan sertifikat & cek ke ATR/BPN; KKPR/RTRW via OSS; identifikasi kebutuhan AMDAL/UKL-UPL & PBG serta estimasi waktunya'),

('C6', 1, 'Risiko tinggi di beberapa aspek tanpa mitigasi jelas; berpotensi melampaui risk appetite', 'Susun risk register awal (pasar, konstruksi, hukum, likuiditas, reputasi, force majeure); bandingkan dgn risk appetite statement; tandai risiko yang wajib didalami saat due diligence'),
('C6', 3, 'Risiko moderat, sebagian mitigasi teridentifikasi', 'Susun risk register awal (pasar, konstruksi, hukum, likuiditas, reputasi, force majeure); bandingkan dgn risk appetite statement; tandai risiko yang wajib didalami saat due diligence'),
('C6', 5, 'Risiko terkendali, mitigasi jelas, sesuai risk appetite perusahaan', 'Susun risk register awal (pasar, konstruksi, hukum, likuiditas, reputasi, force majeure); bandingkan dgn risk appetite statement; tandai risiko yang wajib didalami saat due diligence'),

('C7', 1, 'Menyerap dana/SDM sangat besar relatif kapasitas; kompleksitas tinggi; mengganggu proyek berjalan', 'Bandingkan nilai investasi dgn kapasitas belanja modal/RKAP; cek ketersediaan tim; identifikasi kebutuhan pendanaan eksternal & dampak DSCR'),
('C7', 3, 'Kebutuhan resource signifikan namun terkelola', 'Bandingkan nilai investasi dgn kapasitas belanja modal/RKAP; cek ketersediaan tim; identifikasi kebutuhan pendanaan eksternal & dampak DSCR'),
('C7', 5, 'Kebutuhan resource ringan; skema pendanaan jelas; eksekusi sederhana', 'Bandingkan nilai investasi dgn kapasitas belanja modal/RKAP; cek ketersediaan tim; identifikasi kebutuhan pendanaan eksternal & dampak DSCR'),

('C8', 1, 'Tidak ada sinergi/nilai tambah non-finansial; potensi isu ESG/sosial', 'Identifikasi sinergi dgn entitas grup; cek aspek ESG (lingkungan, sosial, tata kelola); jika ada unsur penugasan, minta dasar penugasan tertulis'),
('C8', 3, 'Ada sinergi atau manfaat sosial namun terbatas', 'Identifikasi sinergi dgn entitas grup; cek aspek ESG (lingkungan, sosial, tata kelola); jika ada unsur penugasan, minta dasar penugasan tertulis'),
('C8', 5, 'Sinergi grup/BUMN kuat, dampak ESG-sosial positif, atau mendukung penugasan resmi', 'Identifikasi sinergi dgn entitas grup; cek aspek ESG (lingkungan, sosial, tata kelola); jika ada unsur penugasan, minta dasar penugasan tertulis')
on conflict (kriteria_kode, skor_level) do nothing;
