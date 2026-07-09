import type { SupabaseClient } from "@supabase/supabase-js";
import { SCORING_CRITERIA, type ScoringKode } from "./schema";

/** Saran nomor registrasi "PRP-{tahun}-{urutan}", tetap bisa diedit user di form. */
export async function suggestNomorRegistrasi(
  supabase: SupabaseClient,
  formId: string,
): Promise<string> {
  const tahun = new Date().getFullYear();

  try {
    const { count } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("form_id", formId)
      .gte("dibuat_pada", `${tahun}-01-01`);

    const urutan = (count ?? 0) + 1;
    return `PRP-${tahun}-${String(urutan).padStart(3, "0")}`;
  } catch {
    return `PRP-${tahun}-001`;
  }
}

/** Tambah N hari kerja (Senin-Jumat) ke tanggal (format YYYY-MM-DD), untuk default target selesai. */
export function tambahHariKerja(tanggalIso: string, jumlahHari: number): string {
  const tanggal = new Date(`${tanggalIso}T00:00:00`);
  let ditambahkan = 0;

  while (ditambahkan < jumlahHari) {
    tanggal.setDate(tanggal.getDate() + 1);
    const hari = tanggal.getDay();
    if (hari !== 0 && hari !== 6) {
      ditambahkan += 1;
    }
  }

  return tanggal.toISOString().slice(0, 10);
}

/** Nilai tertimbang (bobot x skor) untuk satu kriteria, dibulatkan 4 desimal untuk hindari floating point noise. */
export function nilaiTertimbang(kode: ScoringKode, skor: number): number {
  const kriteria = SCORING_CRITERIA.find((k) => k.kode === kode);
  if (!kriteria) return 0;
  return Math.round(kriteria.bobot * skor * 10000) / 10000;
}

/** Total skor tertimbang (maksimal 5.00 jika semua skor 5), dibulatkan 2 desimal. */
export function hitungTotalSkor(skorPerKriteria: Partial<Record<ScoringKode, number>>): number {
  const total = SCORING_CRITERIA.reduce((jumlah, { kode }) => {
    const skor = skorPerKriteria[kode];
    return jumlah + (skor ? nilaiTertimbang(kode, skor) : 0);
  }, 0);
  return Math.round(total * 100) / 100;
}

/** Rekomendasi otomatis berdasarkan total skor (4 ambang batas, PANDUAN.md Prompt 4.1). */
export function getRekomendasi(totalSkor: number): { label: string; kelas: string } {
  if (totalSkor >= 4) {
    return {
      label: "PRIORITAS A - lanjut studi kelayakan penuh",
      kelas: "bg-green-100 text-green-800",
    };
  }
  if (totalSkor >= 3) {
    return {
      label: "PRIORITAS B - lanjut dengan catatan perbaikan/klarifikasi",
      kelas: "bg-blue-100 text-blue-800",
    };
  }
  if (totalSkor >= 2) {
    return {
      label: "PARKIR - minta perbaikan proposal, evaluasi ulang maksimal 1 kali",
      kelas: "bg-yellow-100 text-yellow-800",
    };
  }
  return { label: "TIDAK DILANJUTKAN", kelas: "bg-red-100 text-red-800" };
}
