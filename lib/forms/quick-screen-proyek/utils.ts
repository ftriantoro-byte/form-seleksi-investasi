import type { SupabaseClient } from "@supabase/supabase-js";
import { SCORING_CRITERIA, DIMENSI_LIST, type Dimensi, type ScoringKode } from "./schema";

/** Saran nomor dokumen "QSP-{tahun}-{urutan}", tetap bisa diedit user di form. */
export async function suggestNomorDokumen(
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
    return `QSP-${tahun}-${String(urutan).padStart(3, "0")}`;
  } catch {
    return `QSP-${tahun}-001`;
  }
}

/**
 * Tanggal "hari ini" menurut zona waktu Indonesia Barat (WIB, UTC+7, tanpa DST),
 * dipakai sebagai default tanggal di form. Tidak bergantung pada timezone server
 * (Vercel default UTC) - digeser manual 7 jam sebelum diambil tanggal UTC-nya.
 */
export function hariIniWib(): string {
  const tujuhJamMs = 7 * 60 * 60 * 1000;
  return new Date(Date.now() + tujuhJamMs).toISOString().slice(0, 10);
}

/** Skor per dimensi (jumlah 5 kriteria per dimensi, maksimal 15/dimensi). */
export function hitungSkorDimensi(
  skorPerKriteria: Partial<Record<ScoringKode, number>>,
): Record<Dimensi, number> {
  const hasil = { pasar: 0, teknis: 0, legal: 0, skemaFinansial: 0 } as Record<
    Dimensi,
    number
  >;
  for (const { kode, dimensi } of SCORING_CRITERIA) {
    hasil[dimensi as Dimensi] += skorPerKriteria[kode] ?? 0;
  }
  return hasil;
}

/** Total skor (jumlah 20 kriteria, maksimal 60). */
export function hitungTotalSkor(skorPerKriteria: Partial<Record<ScoringKode, number>>): number {
  const perDimensi = hitungSkorDimensi(skorPerKriteria);
  return DIMENSI_LIST.reduce((total, dimensi) => total + perDimensi[dimensi], 0);
}

/** Hasil GO/GO BERSYARAT/CAUTION/NO-GO berdasarkan total skor (maksimal 60). */
export function getHasilQuickScreen(totalSkor: number): { label: string; kelas: string } {
  if (totalSkor >= 48) {
    return { label: "GO — SANGAT DIREKOMENDASIKAN", kelas: "bg-emerald-50 text-emerald-600" };
  }
  if (totalSkor >= 36) {
    return {
      label: "GO BERSYARAT — DIREKOMENDASIKAN DENGAN CATATAN",
      kelas: "bg-blue-50 text-blue-600",
    };
  }
  if (totalSkor >= 28) {
    return { label: "CAUTION — PERLU KAJIAN TAMBAHAN", kelas: "bg-amber-50 text-amber-600" };
  }
  return { label: "NO-GO — TIDAK DIREKOMENDASIKAN", kelas: "bg-red-50 text-red-600" };
}
