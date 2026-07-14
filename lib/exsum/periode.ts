// Laporan Exsum dibuat rutin 1x/bulan (catatan user) - Periode & No. Dokumen
// diturunkan dari pilihan Bulan+Tahun, bukan diketik bebas, supaya format
// selalu konsisten ("Juni 2026" / "EXUM/06/2026", sesuai konvensi yang
// sudah dipakai user di laporan production pertama mereka).

export const BULAN_LIST = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export function formatPeriode(bulanIdx: number, tahun: number): string {
  return `${BULAN_LIST[bulanIdx] ?? BULAN_LIST[0]} ${tahun}`;
}

export function formatNoDok(bulanIdx: number, tahun: number): string {
  return `EXUM/${String(bulanIdx + 1).padStart(2, "0")}/${tahun}`;
}

/** Best-effort baca balik "Bulan Tahun" (mis. hasil ketikan bebas dari laporan lama) jadi index+tahun. */
export function parsePeriode(periode: string): { bulan: number; tahun: number } | null {
  const match = periode.trim().match(/(\p{L}+)\D*(\d{4})/u);
  if (!match) return null;
  const bulanIdx = BULAN_LIST.findIndex((b) => b.toLowerCase() === match[1].toLowerCase());
  if (bulanIdx === -1) return null;
  return { bulan: bulanIdx, tahun: Number(match[2]) };
}

export function addMonths(bulanIdx: number, tahun: number, delta: number): { bulan: number; tahun: number } {
  const total = bulanIdx + delta;
  const tahunBaru = tahun + Math.floor(total / 12);
  const bulanBaru = ((total % 12) + 12) % 12;
  return { bulan: bulanBaru, tahun: tahunBaru };
}
