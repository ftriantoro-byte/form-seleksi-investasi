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
// kartu Board/baris List/chip Calendar - lihat TASK_COLOR_ACCENT_KELAS.
// KHUSUS blok Time Box, kanalnya DITUKAR (susulan permintaan user): warna
// pilihan user jadi FILL blok (TASK_COLOR_FILL_KELAS), status jadi garis
// kiri (TASK_STATUS_BORDER_KELAS) - supaya di grid Time Box yg padat,
// warna kustom (paling sering dipakai kelompokkan per proyek/klien) lebih
// dominan/gampang di-scan drpd status.
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

// Versi FILL (bg lembut + teks) dari warna Task, dipakai KHUSUS blok Time
// Box sbg warna blok utama (lihat catatan di atas) - palet lembut yg sama
// gayanya dgn TASK_STATUS_BADGE_KELAS/TASK_PRIORITY_BADGE_KELAS supaya
// tetap konsisten scr visual, cuma sumber datanya beda (pilihan user, bukan
// status/priority).
export const TASK_COLOR_FILL_KELAS: Record<string, string> = {
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  gray: "bg-zinc-100 text-zinc-600",
};

// Garis kiri per status, dipakai KHUSUS blok Time Box (lihat catatan di
// atas) - warna beda dari TASK_STATUS_BADGE_KELAS (yg fill lembut) krn di
// sini perlu warna PEKAT supaya garis 4px-nya kelihatan jelas di atas fill
// blok yg juga berwarna.
export const TASK_STATUS_BORDER_KELAS: Record<string, string> = {
  to_do: "border-l-4 border-l-zinc-400",
  in_progress: "border-l-4 border-l-blue-500",
  in_review: "border-l-4 border-l-amber-500",
  done: "border-l-4 border-l-emerald-500",
};

// Warna avatar per-assignee di blok Time Box (susulan permintaan user:
// "tanda khusus di blok task utk masing2 assignee, supaya bisa lihat task
// siapa") - dipilih DETERMINISTIK dari hash user_id (bukan acak tiap
// render, & tidak perlu tabel mapping user->warna baru) supaya 1 orang yg
// sama SELALU dapat warna avatar yg sama di seluruh Time Box. Palet
// SENGAJA beda dari TASK_COLOR_VALUES (yg dipakai user pilih warna Task
// sendiri) - avatar pakai warna PEKAT (500/600) sedangkan fill blok pakai
// pastel (100), jadi tetap kebeda meski nama warnanya kebetulan mirip.
const AVATAR_COLOR_KELAS = [
  "bg-teal-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
  "bg-rose-500",
  "bg-lime-600",
  "bg-amber-500",
  "bg-sky-500",
];

export function avatarKelasForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLOR_KELAS[hash % AVATAR_COLOR_KELAS.length];
}
