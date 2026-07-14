// Bentuk kolom `exsum_reports.data` (jsonb) - persis mengikuti struktur
// objek DATA di file sumber exsum-framework-wege.html yang diadaptasi
// jadi modul ini. Kolom perusahaan/kode/periode/noDok/status di tabel
// TIDAK diulang di sini karena sudah kolom terpisah (lihat migrasi),
// bukan bagian dari `data`.

export type ExsumPesaing = {
  nama: string;
  share: number;
  gpm: number;
  opm: number;
  npm: number;
  rank: number;
  highlight?: boolean;
};

export type ExsumKompetitif = {
  peringkat: number;
  peringkatSebelum: number;
  share: number;
  shareSebelum: number;
  sumber: string;
  pesaing: ExsumPesaing[];
  narasi: string;
};

export type ExsumBaikJika = "tinggi" | "rendah";

export type ExsumKeuanganKPI = {
  grup: string;
  nama: string;
  target: number | null;
  lalu: number;
  kini: number;
  baikJika: ExsumBaikJika;
};

export type ExsumPortofolioRow = {
  nama: string;
  rkap: number;
  // RA = Rencana/Anggaran bulan berjalan (Rp jt) - beda dari RKAP yang
  // rencana 1 tahun penuh, RA angka rencana KHUSUS bulan ini (catatan
  // user: parameter Kinerja Portofolio ada 4: nama/RKAP/RA/RI).
  ra: number;
  ri: number;
  pct: number;
};

export type ExsumRasio = {
  nilai: string;
  nama: string;
  ket: string;
};

export type ExsumSegmen = {
  nama: string;
  // Rp juta - angka polos (bukan teks berformat "Rp 465,4 M") supaya `pct`
  // bisa dihitung otomatis dari proporsinya, sesuai catatan user: "Persentase
  // otomatis dari jumlah nilai". Ditampilkan lewat idn() di ExsumDocument,
  // konsisten dgn kolom Rp jt lain (RKAP/RI dst).
  nilai: number;
  pct: number;
  warna: string;
};

export type ExsumPortofolio = {
  rows: ExsumPortofolioRow[];
  rasio: ExsumRasio[];
  segmen: ExsumSegmen[];
  narasi: string;
};

export type ExsumCapexItem = {
  nama: string;
  rkap: number;
  ri: number;
};

export type ExsumCapex = {
  realisasiPct: number;
  heroCaption: string;
  heroSub: string;
  items: ExsumCapexItem[];
  narasi: string;
};

export type ExsumIsu = {
  eksternal: string[];
  internal: string[];
  mitigasi: string[];
};

export type ExsumMitra = {
  judul: string;
  isi: string;
  full?: boolean;
};

export type ExsumData = {
  judul: string;
  subjudul: string;
  kompetitif: ExsumKompetitif;
  keuangan: ExsumKeuanganKPI[];
  keuanganLabelLalu: string;
  keuanganNarasi: string;
  portofolio: ExsumPortofolio;
  capex: ExsumCapex;
  isu: ExsumIsu;
  mitra: ExsumMitra[];
  rekomendasi: string[];
};

export type ExsumReport = {
  id: string;
  perusahaan: string;
  kode: string;
  periode: string;
  no_dok: string;
  status: "Draft" | "Final";
  data: ExsumData;
  dibuat_pada: string;
  diupdate_pada: string;
};

export const EXSUM_BLANK_DATA: ExsumData = {
  judul: "Executive Summary",
  subjudul: "",
  kompetitif: {
    peringkat: 0,
    peringkatSebelum: 0,
    share: 0,
    shareSebelum: 0,
    sumber: "",
    pesaing: [],
    narasi: "",
  },
  keuangan: [],
  keuanganLabelLalu: "",
  keuanganNarasi: "",
  portofolio: { rows: [], rasio: [], segmen: [], narasi: "" },
  capex: { realisasiPct: 0, heroCaption: "", heroSub: "", items: [], narasi: "" },
  isu: { eksternal: [], internal: [], mitigasi: [] },
  mitra: [],
  rekomendasi: [],
};
