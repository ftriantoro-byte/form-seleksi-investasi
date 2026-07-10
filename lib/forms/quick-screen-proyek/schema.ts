import { z } from "zod";

export const STATUS_DOKUMEN_OPTIONS = ["Draft", "Berlaku", "Revisi"] as const;

export const bagianASchema = z.object({
  noDokumen: z.string().min(1, "No. dokumen wajib diisi"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  statusDokumen: z.enum(STATUS_DOKUMEN_OPTIONS, {
    message: "Status dokumen wajib dipilih",
  }),
  namaProyek: z.string().min(1, "Nama proyek wajib diisi"),
  sektorTipologiProyek: z.string().min(1, "Sektor/tipologi proyek wajib diisi"),
  pemilikPemberiInformasi: z.string().min(1, "Pemilik/pemberi informasi wajib diisi"),
  lokasiProyek: z.string().min(1, "Lokasi proyek wajib diisi"),
  tanggalInfoDiterima: z.string().min(1, "Tanggal info diterima wajib diisi"),
  estimasiNilaiProyek: z.coerce
    .number()
    .positive("Estimasi nilai proyek harus lebih dari 0"),
  sumberInformasi: z.string().min(1, "Sumber informasi wajib diisi"),
  deskripsiProyek: z.string().min(1, "Deskripsi proyek wajib diisi"),
});

export type BagianAInput = z.infer<typeof bagianASchema>;

// ── Bagian B: skema kerjasama (checklist, bukan gate pass/fail) ────────────

export const SKEMA_KERJASAMA_OPTIONS = [
  { kode: "SK1", label: "Design & Build" },
  { kode: "SK2", label: "BLT" },
  { kode: "SK3", label: "BOT" },
  { kode: "SK4", label: "Joint Venture / SPV" },
  { kode: "SK5", label: "KPBU Solicited" },
  { kode: "SK6", label: "KPBU Unsolicited" },
  { kode: "SK7", label: "B2B" },
  { kode: "SK8", label: "EPC/Turnkey" },
] as const;

export type SkemaKode = (typeof SKEMA_KERJASAMA_OPTIONS)[number]["kode"];

const skemaJawabanSchema = z.object({
  dipilih: z.enum(["ya", "tidak"], { message: "Wajib dipilih Ya/Tidak" }),
  catatan: z.string().optional().default(""),
});

export const bagianBSchema = z.object({
  SK1: skemaJawabanSchema,
  SK2: skemaJawabanSchema,
  SK3: skemaJawabanSchema,
  SK4: skemaJawabanSchema,
  SK5: skemaJawabanSchema,
  SK6: skemaJawabanSchema,
  SK7: skemaJawabanSchema,
  SK8: skemaJawabanSchema,
});

export type BagianBInput = z.infer<typeof bagianBSchema>;

// ── Bagian C: penilaian 4 dimensi x 5 kriteria, skala H/M/L = skor 3/2/1 ────

export const DIMENSI_LIST = ["pasar", "teknis", "legal", "skemaFinansial"] as const;
export type Dimensi = (typeof DIMENSI_LIST)[number];

export const SCORING_CRITERIA = [
  { kode: "P1", dimensi: "pasar", label: "Potensi & ukuran pasar / demand nyata" },
  { kode: "P2", dimensi: "pasar", label: "Daya saing & kompetitor di segmen ini" },
  {
    kode: "P3",
    dimensi: "pasar",
    label: "Kesesuaian dengan segmen pasar target perusahaan",
  },
  { kode: "P4", dimensi: "pasar", label: "Potensi revenue berulang / recurring income" },
  { kode: "P5", dimensi: "pasar", label: "Keunikan / diferensiasi (Blue Ocean)" },

  {
    kode: "T1",
    dimensi: "teknis",
    label: "Kapabilitas teknis perusahaan sesuai tipologi proyek",
  },
  { kode: "T2", dimensi: "teknis", label: "Track record di sektor & skala yang sama" },
  {
    kode: "T3",
    dimensi: "teknis",
    label: "Kompleksitas teknis vs. kesiapan SDM & alat",
  },
  { kode: "T4", dimensi: "teknis", label: "Kesiapan lahan & infrastruktur pendukung" },
  { kode: "T5", dimensi: "teknis", label: "Potensi efisiensi modular / digital" },

  {
    kode: "L1",
    dimensi: "legal",
    label: "Status legalitas lahan / aset (sertifikat, HGB)",
  },
  {
    kode: "L2",
    dimensi: "legal",
    label: "Kejelasan perizinan (IMB/PBG, AMDAL, tata ruang)",
  },
  { kode: "L3", dimensi: "legal", label: "Kesesuaian skema dengan regulasi berlaku" },
  {
    kode: "L4",
    dimensi: "legal",
    label: "Tidak ada sengketa / tumpang tindih kepemilikan",
  },
  {
    kode: "L5",
    dimensi: "legal",
    label: "Kejelasan struktur entitas & kewenangan pemilik",
  },

  {
    kode: "SF1",
    dimensi: "skemaFinansial",
    label: "Kesesuaian skema dg kemampuan finansial perusahaan",
  },
  {
    kode: "SF2",
    dimensi: "skemaFinansial",
    label: "Potensi IRR/return memadai (>= WACC+2%)",
  },
  {
    kode: "SF3",
    dimensi: "skemaFinansial",
    label: "Ketersediaan pembiayaan / mitra potensial",
  },
  {
    kode: "SF4",
    dimensi: "skemaFinansial",
    label: "Potensi perolehan kontrak konstruksi (feeding)",
  },
  {
    kode: "SF5",
    dimensi: "skemaFinansial",
    label: "Kejelasan exit strategy / capital gain",
  },
] as const;

export type ScoringKode = (typeof SCORING_CRITERIA)[number]["kode"];

export const SKALA_HML = [
  { nilai: 3, label: "H" },
  { nilai: 2, label: "M" },
  { nilai: 1, label: "L" },
] as const;

const skorKriteriaSchema = z.object({
  skor: z.coerce
    .number({ message: "Skor wajib dipilih" })
    .refine((v) => v === 1 || v === 2 || v === 3, "Skor harus H (3), M (2), atau L (1)"),
  catatan: z.string().optional().default(""),
});

export const bagianCSchema = z.object({
  P1: skorKriteriaSchema,
  P2: skorKriteriaSchema,
  P3: skorKriteriaSchema,
  P4: skorKriteriaSchema,
  P5: skorKriteriaSchema,
  T1: skorKriteriaSchema,
  T2: skorKriteriaSchema,
  T3: skorKriteriaSchema,
  T4: skorKriteriaSchema,
  T5: skorKriteriaSchema,
  L1: skorKriteriaSchema,
  L2: skorKriteriaSchema,
  L3: skorKriteriaSchema,
  L4: skorKriteriaSchema,
  L5: skorKriteriaSchema,
  SF1: skorKriteriaSchema,
  SF2: skorKriteriaSchema,
  SF3: skorKriteriaSchema,
  SF4: skorKriteriaSchema,
  SF5: skorKriteriaSchema,
});

export type BagianCInput = z.infer<typeof bagianCSchema>;

// ── Bagian D: catatan analis ────────────────────────────────────────────────

export const bagianDSchema = z.object({
  faktorPendorong: z.string().min(1, "Faktor pendorong (strength) wajib diisi"),
  faktorRisiko: z.string().min(1, "Faktor risiko (red flag) wajib diisi"),
  dataDibutuhkanOft: z.string().min(1, "Data/dokumen yang dibutuhkan untuk OFT wajib diisi"),
  urgensiTenggat: z.string().min(1, "Urgensi & tenggat wajib diisi"),
});

export type BagianDInput = z.infer<typeof bagianDSchema>;
