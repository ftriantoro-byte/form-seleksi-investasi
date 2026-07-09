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
