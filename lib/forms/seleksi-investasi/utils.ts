import type { SupabaseClient } from "@supabase/supabase-js";

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
