import type { Dimensi } from "./schema";

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  menunggu_manajer: "Menunggu Keputusan Manajer",
  menunggu_vp: "Menunggu Keputusan VP",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export const STATUS_BADGE_KELAS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-500",
  menunggu_manajer: "bg-amber-50 text-amber-600",
  menunggu_vp: "bg-amber-50 text-amber-600",
  disetujui: "bg-emerald-50 text-emerald-600",
  ditolak: "bg-red-50 text-red-600",
};

export const LABEL_TINGKAT: Record<"manajer" | "vp", string> = {
  manajer: "Manajer",
  vp: "VP",
};

export const LABEL_STATUS_APPROVAL: Record<"menunggu" | "disetujui" | "ditolak", string> = {
  menunggu: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export const LABEL_DIMENSI: Record<Dimensi, string> = {
  pasar: "Pasar",
  teknis: "Teknis",
  legal: "Legal",
  skemaFinansial: "Skema & Finansial",
};

export const STEPS = [
  { key: "A", label: "Identitas" },
  { key: "B", label: "Skema Kerjasama" },
  { key: "C", label: "Penilaian" },
  { key: "D", label: "Catatan Analis" },
];
