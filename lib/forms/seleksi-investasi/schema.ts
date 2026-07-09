import { z } from "zod";

export const SUMBER_PROPOSAL_OPTIONS = [
  "Business Development",
  "Disposisi Manajemen",
  "Pemegang Saham",
  "Lainnya",
] as const;

export const bagianASchema = z.object({
  nomorRegistrasi: z.string().min(1, "Nomor registrasi wajib diisi"),
  tanggalDiterima: z.string().min(1, "Tanggal proposal diterima wajib diisi"),
  namaProyek: z.string().min(1, "Nama proyek wajib diisi"),
  lokasiProyek: z.string().min(1, "Lokasi proyek wajib diisi"),
  namaPengusul: z.string().min(1, "Nama pengusul wajib diisi"),
  sumberProposal: z.enum(SUMBER_PROPOSAL_OPTIONS, {
    message: "Sumber proposal wajib dipilih",
  }),
  skemaKerjasama: z.string().min(1, "Skema kerjasama wajib diisi"),
  estimasiNilaiInvestasi: z.coerce
    .number()
    .positive("Estimasi nilai investasi harus lebih dari 0"),
  evaluatorPic: z.string().min(1, "Evaluator/PIC wajib diisi"),
  targetSelesai: z.string().min(1, "Target selesai seleksi awal wajib diisi"),
});

export type BagianAInput = z.infer<typeof bagianASchema>;

// ── Bagian B: 6 kriteria gugur (gate) ───────────────────────────────────────
// Teks kriteria persis sesuai PANDUAN.md Prompt 2.1 — jangan diparafrase.

export const GATE_CRITERIA = [
  {
    kode: "G1",
    label:
      "Kelengkapan dokumen minimum (profil & legalitas pengusul, deskripsi proyek, bukti penguasaan/status lahan-aset, indikasi angka finansial)",
  },
  {
    kode: "G2",
    label: "Kesesuaian dengan core business, RJPP/RKAP, dan arah portofolio perusahaan",
  },
  { kode: "G3", label: "Status hukum lahan/aset jelas dan bebas indikasi sengketa" },
  {
    kode: "G4",
    label: "Skema kerjasama diperbolehkan bagi BUMN sesuai regulasi & anggaran dasar",
  },
  {
    kode: "G5",
    label:
      "Calon mitra tidak masuk daftar hitam, tidak pailit/PKPU, tidak ada benturan kepentingan",
  },
  {
    kode: "G6",
    label:
      "Peruntukan tata ruang lokasi tidak bertentangan dengan rencana proyek (KKPR/RTRW)",
  },
] as const;

export type GateKode = (typeof GATE_CRITERIA)[number]["kode"];

const gateJawabanSchema = z.object({
  jawaban: z.enum(["ya", "tidak"], { message: "Jawaban wajib dipilih" }),
  catatan: z.string().min(1, "Bukti/catatan wajib diisi"),
});

export const bagianBSchema = z.object({
  G1: gateJawabanSchema,
  G2: gateJawabanSchema,
  G3: gateJawabanSchema,
  G4: gateJawabanSchema,
  G5: gateJawabanSchema,
  G6: gateJawabanSchema,
});

export type BagianBInput = z.infer<typeof bagianBSchema>;

// ── Bagian C: 8 kriteria skoring berbobot ───────────────────────────────────
// Teks & bobot persis sesuai PANDUAN.md Prompt 3.1 — jangan diparafrase.

export const SCORING_CRITERIA = [
  {
    kode: "C1",
    label:
      "Kesesuaian strategis (strategic fit) dengan RJPP, core business & portofolio",
    bobot: 0.15,
  },
  { kode: "C2", label: "Potensi pasar & permintaan", bobot: 0.2 },
  { kode: "C3", label: "Indikasi kelayakan finansial", bobot: 0.2 },
  { kode: "C4", label: "Kredibilitas & kapasitas calon mitra", bobot: 0.15 },
  { kode: "C5", label: "Kesiapan lahan & perizinan", bobot: 0.1 },
  { kode: "C6", label: "Profil risiko awal & ketersediaan mitigasi", bobot: 0.1 },
  { kode: "C7", label: "Kebutuhan sumber daya & kompleksitas eksekusi", bobot: 0.05 },
  {
    kode: "C8",
    label: "Nilai strategis non-finansial (sinergi grup/BUMN, ESG, dampak sosial)",
    bobot: 0.05,
  },
] as const;

export type ScoringKode = (typeof SCORING_CRITERIA)[number]["kode"];

const skorKriteriaSchema = z.object({
  skor: z.coerce
    .number({ message: "Skor wajib dipilih" })
    .int("Skor harus bilangan bulat")
    .min(1, "Skor minimal 1")
    .max(5, "Skor maksimal 5"),
  justifikasi: z.string().min(1, "Justifikasi & sumber data wajib diisi"),
});

export const bagianCSchema = z.object({
  C1: skorKriteriaSchema,
  C2: skorKriteriaSchema,
  C3: skorKriteriaSchema,
  C4: skorKriteriaSchema,
  C5: skorKriteriaSchema,
  C6: skorKriteriaSchema,
  C7: skorKriteriaSchema,
  C8: skorKriteriaSchema,
});

export type BagianCInput = z.infer<typeof bagianCSchema>;

// ── Bagian D: catatan evaluator & pernyataan benturan kepentingan ──────────

export const bagianDSchema = z.object({
  catatanEvaluator: z.string().min(1, "Catatan evaluator wajib diisi"),
  pernyataanBebasBenturan: z.enum(["ya", "tidak"], {
    message: "Pernyataan bebas benturan kepentingan wajib dipilih",
  }),
});

export type BagianDInput = z.infer<typeof bagianDSchema>;
