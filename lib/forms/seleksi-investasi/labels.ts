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
