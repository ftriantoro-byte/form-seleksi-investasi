import { z } from "zod";

export const EXSUM_STATUS_VALUES = ["Draft", "Final"] as const;

export const exsumReportMetaSchema = z.object({
  perusahaan: z.string().min(1, "Nama perusahaan wajib diisi"),
  kode: z.string().min(1, "Kode wajib diisi"),
  periode: z.string().min(1, "Periode wajib diisi"),
  noDok: z.string().min(1, "No. Dokumen wajib diisi"),
  status: z.enum(EXSUM_STATUS_VALUES),
});
