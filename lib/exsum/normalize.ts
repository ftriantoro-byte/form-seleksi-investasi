import type {
  ExsumData,
  ExsumKompetitif,
  ExsumPortofolioRow,
  ExsumSegmen,
  ExsumCapexItem,
} from "@/lib/exsum/types";

// Field turunan (dihitung, bukan diketik user) - Peringkat/Share Kompetitif
// ikut baris pesaing yang ditandai "Ini kami", Persen tiap Segmen dari
// proporsi Nilai, Realisasi % CAPEX dari total Realisasi/RKAP (catatan
// user). Fungsi murni, dipakai baik di ExsumEditForm (Client Component,
// tiap kali user mengedit) maupun halaman tampilan/cetak Server Component
// (sekali saat render, supaya laporan lama yang belum disunting ulang
// setelah fitur ini ada tetap tampil konsisten - bukan cuma angka manual
// lama yang mungkin sudah tidak presisi).
export function syncKompetitifFromHighlight(kompetitif: ExsumKompetitif): ExsumKompetitif {
  const highlighted = kompetitif.pesaing.find((p) => p.highlight);
  return highlighted
    ? { ...kompetitif, peringkat: highlighted.rank, share: highlighted.share }
    : kompetitif;
}

export function recomputeSegmenPct(segmen: ExsumSegmen[]): ExsumSegmen[] {
  // Number(...) jaga-jaga laporan lama (sebelum `nilai` jadi kolom angka
  // murni) masih simpan string - tanpa ini, `sum + s.nilai` di reduce jadi
  // KONKATENASI STRING (bukan penjumlahan) begitu 1 saja nilai-nya string,
  // bikin total ngaco & pct semua baris jadi 0.
  const coerced = segmen.map((s) => ({ ...s, nilai: Number(s.nilai) || 0 }));
  const total = coerced.reduce((sum, s) => sum + s.nilai, 0);
  return coerced.map((s) => ({
    ...s,
    pct: total > 0 ? Math.round((s.nilai / total) * 10000) / 100 : 0,
  }));
}

export function recomputeCapexPct(items: ExsumCapexItem[]): number {
  const totalRkap = items.reduce((sum, it) => sum + it.rkap, 0);
  const totalRi = items.reduce((sum, it) => sum + it.ri, 0);
  return totalRkap > 0 ? Math.round((totalRi / totalRkap) * 10000) / 100 : 0;
}

// `ra` (RA Bulan Berjalan) ditambahkan belakangan (susulan permintaan user)
// - laporan yang dibuat sebelum field ini ada tidak punya `ra` sama sekali
// di data jsonb-nya (`undefined`), bukan cuma 0. `idn(undefined)` di
// ExsumDocument akan crash kalau tidak dijaga di sini.
export function normalizePortofolioRows(rows: ExsumPortofolioRow[]): ExsumPortofolioRow[] {
  return rows.map((r) => ({ ...r, ra: r.ra ?? 0 }));
}

export function normalizeExsumData(data: ExsumData): ExsumData {
  return {
    ...data,
    kompetitif: syncKompetitifFromHighlight(data.kompetitif),
    portofolio: {
      ...data.portofolio,
      rows: normalizePortofolioRows(data.portofolio.rows),
      segmen: recomputeSegmenPct(data.portofolio.segmen),
    },
    capex: { ...data.capex, realisasiPct: recomputeCapexPct(data.capex.items) },
  };
}
