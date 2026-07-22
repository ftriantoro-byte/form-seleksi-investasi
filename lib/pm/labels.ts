export const TASK_STATUS_LABEL: Record<string, string> = {
  to_do: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export const TASK_STATUS_BADGE_KELAS: Record<string, string> = {
  to_do: "bg-zinc-100 text-zinc-600",
  in_progress: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

export const TASK_PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const TASK_PRIORITY_BADGE_KELAS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-zinc-100 text-zinc-600",
  low: "bg-zinc-50 text-zinc-400",
};

// Warna aksen Task (susulan permintaan user) - SENGAJA kanal visual
// terpisah dari status (badge status pakai warna sendiri di atas) supaya
// tidak tabrakan makna; warna ini murni penanda visual bebas pilih user
// (mis. kelompokkan per klien/tema), diterapkan sbg aksen border kiri di
// kartu Board/baris List/chip Calendar/blok Time Box - lihat
// TASK_COLOR_ACCENT_KELAS.
export const TASK_COLOR_LABEL: Record<string, string> = {
  red: "Merah",
  orange: "Oranye",
  yellow: "Kuning",
  green: "Hijau",
  blue: "Biru",
  purple: "Ungu",
  gray: "Abu-abu",
};

export const TASK_COLOR_DOT_KELAS: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  gray: "bg-zinc-400",
};

export const TASK_COLOR_ACCENT_KELAS: Record<string, string> = {
  red: "border-l-4 border-l-red-500",
  orange: "border-l-4 border-l-orange-500",
  yellow: "border-l-4 border-l-yellow-400",
  green: "border-l-4 border-l-green-500",
  blue: "border-l-4 border-l-blue-500",
  purple: "border-l-4 border-l-purple-500",
  gray: "border-l-4 border-l-zinc-400",
};
