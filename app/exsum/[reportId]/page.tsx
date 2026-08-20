import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isExsumEditor } from "@/lib/exsum/access";
import { deleteReport } from "@/actions/exsum";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { ExsumDocument } from "@/components/exsum/ExsumDocument";
import { ExsumPrintButton } from "@/components/exsum/ExsumPrintButton";
import { normalizeExsumData } from "@/lib/exsum/normalize";
import { parsePeriode } from "@/lib/exsum/periode";
import type { ExsumData } from "@/lib/exsum/types";

export default async function ExsumReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const supabase = await createClient();

  const [{ data: report }, isEditor] = await Promise.all([
    supabase
      .from("exsum_reports")
      .select("id, perusahaan, kode, periode, no_dok, status, data, dibuat_pada")
      .eq("id", reportId)
      .single(),
    isExsumEditor(),
  ]);

  if (!report) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Laporan tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
        <Link href="/exsum" className="mt-3 inline-block text-[13px] font-medium text-zinc-600 hover:underline">
          &larr; Kembali ke Riwayat Laporan
        </Link>
      </FormPageShell>
    );
  }

  // Normalisasi field turunan (Peringkat/Share, Persen Segmen, Realisasi %
  // CAPEX) - laporan lama yang belum disunting ulang sejak field ini jadi
  // otomatis masih bisa simpan angka manual sedikit meleset, ditampilkan
  // versi terhitungnya di sini tanpa perlu user buka form edit dulu.
  const data = normalizeExsumData(report.data as ExsumData);

  // Permintaan user: perbandingan Kinerja Keuangan 3 bulan terakhir (laporan
  // ini + 2 laporan sebelumnya, kode Perusahaan yang sama) - histori nyata
  // dari laporan-laporan bulan lalu yang SUDAH tersimpan (bukan field baru
  // yang perlu diisi ulang). Diurutkan berdasar KALENDER periode asli
  // (`parsePeriode` -> tahun*12+bulan), BUKAN `dibuat_pada` - laporan
  // production yang ada TERNYATA tidak selalu dibuat berurutan sesuai
  // bulannya (mis. laporan Juni dibuat lebih dulu dari April/Mei), jadi
  // urutan "dibuat" tidak bisa dipakai sbg proxy urutan bulan sungguhan
  // seperti asumsi awal (`findPreviousReport` di actions/exsum.ts masih
  // sengaja pakai `dibuat_pada` krn tujuannya beda - cuma perlu "laporan
  // yang paling baru disentuh" utk auto-isi form, bukan urutan kalender).
  const { data: semuaKode } = await supabase
    .from("exsum_reports")
    .select("id, periode, data")
    .eq("kode", report.kode);

  const periodeKey = (periode: string) => {
    const p = parsePeriode(periode);
    return p ? p.tahun * 12 + p.bulan : null;
  };
  const kunciSekarang = periodeKey(report.periode);

  const historisKeuangan = (semuaKode ?? [])
    .filter((r) => r.id !== report.id)
    .map((r) => ({ periode: r.periode, keuangan: (r.data as ExsumData).keuangan ?? [], kunci: periodeKey(r.periode) }))
    .filter((r): r is typeof r & { kunci: number } => r.kunci !== null && kunciSekarang !== null && r.kunci < kunciSekarang)
    .sort((a, b) => b.kunci - a.kunci)
    .slice(0, 2)
    .sort((a, b) => a.kunci - b.kunci)
    .map(({ periode, keuangan }) => ({ periode, keuangan }));

  return (
    <div>
      <div className="exsum-print-hide mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-3 px-6 pt-6">
        <Link href="/exsum" className="text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-900">
          &larr; Kembali ke Riwayat Laporan
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <ExsumPrintButton />
          {isEditor && (
            <>
              <Link
                href={`/exsum/${reportId}/edit`}
                className="rounded-full bg-zinc-900 px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700"
              >
                ✎ Edit
              </Link>
              <Link
                href={`/exsum/${reportId}/duplikat`}
                className="rounded-full bg-zinc-100 px-4 py-1.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
              >
                ⎘ Duplikat ke bulan baru
              </Link>
              <form action={deleteReport}>
                <input type="hidden" name="reportId" value={reportId} />
                <button
                  type="submit"
                  className="rounded-full bg-red-50 px-4 py-1.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-100"
                >
                  Hapus
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <ExsumDocument
        perusahaan={report.perusahaan}
        kode={report.kode}
        periode={report.periode}
        noDok={report.no_dok}
        status={report.status}
        data={data}
        historisKeuangan={historisKeuangan}
      />
    </div>
  );
}
