import type { ExsumData } from "@/lib/exsum/types";

// Catatan user: "karena exsum ini dibuat sebulan 1x rutin, data-data yang
// merujuk periode sebelumnya (Peringkat/Share Sebelum, label bulan
// pembanding, nilai 'lalu' tiap KPI Keuangan) otomatis dari data bulan
// sebelumnya" - bukan diketik ulang manual tiap bulan.
//
// mode "duplicate": `base` sudah salinan PERSIS data `previous` (dari
// duplicateReport) - kini tiap KPI TETAP dipertahankan sbg titik awal utk
// disunting user jadi angka bulan berjalan, `lalu` diisi = kini LAMA
// (sebelum disunting, jadi tepat setelah duplikat kini===lalu, wajar -
// baru beda setelah user update kini).
// mode "blank": `base` kosong (Buat Laporan Baru) - struktur KPI (nama/
// grup/target/baikJika) ikut disalin dari `previous` supaya tidak perlu
// bikin ulang daftar KPI tiap bulan, tapi `kini` di-reset ke 0 (laporan
// baru, memang belum ada datanya) sementara `lalu` = kini LAMA.
export function seedFromPrevious(
  base: ExsumData,
  previous: { periode: string; data: ExsumData } | null,
  mode: "blank" | "duplicate",
): ExsumData {
  if (!previous) return base;

  const keuangan =
    mode === "duplicate"
      ? base.keuangan.map((k) => ({ ...k, lalu: k.kini }))
      : previous.data.keuangan.map((k) => ({ ...k, lalu: k.kini, kini: 0 }));

  return {
    ...base,
    keuanganLabelLalu: previous.periode,
    keuangan,
    kompetitif: {
      ...base.kompetitif,
      peringkatSebelum: previous.data.kompetitif.peringkat,
      shareSebelum: previous.data.kompetitif.share,
    },
  };
}
