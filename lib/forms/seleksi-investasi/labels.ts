export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  menunggu_skoring: "Menunggu Skoring",
  tidak_lulus_gate: "Tidak Lulus Gate",
  menunggu_manajer: "Menunggu Keputusan Manajer",
  menunggu_vp: "Menunggu Keputusan VP",
  menunggu_direksi: "Menunggu Keputusan Direksi",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export const LABEL_TINGKAT: Record<"manajer" | "vp" | "direksi", string> = {
  manajer: "Manajer",
  vp: "VP",
  direksi: "Direksi",
};

export const LABEL_STATUS_APPROVAL: Record<"menunggu" | "disetujui" | "ditolak", string> = {
  menunggu: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

/** Kelas warna badge status (bg + text), dipakai di halaman detail & dashboard. */
export const STATUS_BADGE_KELAS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-500",
  menunggu_skoring: "bg-blue-50 text-blue-600",
  tidak_lulus_gate: "bg-red-50 text-red-600",
  menunggu_manajer: "bg-amber-50 text-amber-600",
  menunggu_vp: "bg-amber-50 text-amber-600",
  menunggu_direksi: "bg-amber-50 text-amber-600",
  disetujui: "bg-emerald-50 text-emerald-600",
  ditolak: "bg-red-50 text-red-600",
};
