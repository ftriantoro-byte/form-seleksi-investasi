import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isExsumEditor } from "@/lib/exsum/access";
import { deleteReport } from "@/actions/exsum";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { ExsumDocument } from "@/components/exsum/ExsumDocument";
import { ExsumPrintButton } from "@/components/exsum/ExsumPrintButton";
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
      .select("id, perusahaan, kode, periode, no_dok, status, data")
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

  const data = report.data as ExsumData;

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
      />
    </div>
  );
}
