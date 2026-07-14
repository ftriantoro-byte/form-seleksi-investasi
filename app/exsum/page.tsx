import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isExsumEditor } from "@/lib/exsum/access";
import { EXSUM_STATUS_VALUES } from "@/lib/exsum/schema";
import { createReport } from "@/actions/exsum";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { FormField } from "@/components/ui/FormField";

type ExsumReportRow = {
  id: string;
  perusahaan: string;
  kode: string;
  periode: string;
  no_dok: string;
  status: string;
  diupdate_pada: string;
};

// Akses baca terbuka utk semua pegawai login (RLS: auth.role() = 'authenticated'
// di migrasi exsum_reports) - laporan Direksi/Komisaris ini memang ditujukan
// dibaca luas. Buat/ubah/hapus dibatasi whitelist exsum_editors (lihat
// requireExsumEditor di actions/exsum.ts).
export default async function ExsumListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: reportsRaw }, isEditor] = await Promise.all([
    supabase
      .from("exsum_reports")
      .select("id, perusahaan, kode, periode, no_dok, status, diupdate_pada")
      .order("dibuat_pada", { ascending: false }),
    isExsumEditor(),
  ]);

  const reports = (reportsRaw ?? []) as ExsumReportRow[];

  return (
    <FormPageShell maxWidth="max-w-3xl">
      <FormPageHeader
        title="Executive Summary"
        subtitle="Laporan ringkasan kinerja bulanan untuk Direksi & Dewan Komisaris."
        backHref="/"
        backLabel="Beranda"
      />

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">{error}</p>
      )}

      <div className="rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Riwayat Laporan</h3>
        <ul className="mt-4 space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/exsum/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 text-[14px] text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {r.perusahaan} <span className="text-zinc-400">· {r.kode}</span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-zinc-400">
                    {r.periode} &middot; {r.no_dok}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    r.status === "Final" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {r.status}
                </span>
              </Link>
            </li>
          ))}
          {reports.length === 0 && (
            <li className="text-[14px] text-zinc-400">Belum ada laporan.</li>
          )}
        </ul>
      </div>

      {isEditor && (
        <div className="mt-8 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
          <h3 className="text-[14px] font-semibold text-zinc-900">Buat Laporan Baru</h3>
          <form action={createReport} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Perusahaan" name="perusahaan" />
            <FormField label="Kode" name="kode" />
            <FormField label="Periode" name="periode" />
            <FormField label="No. Dokumen" name="noDok" />
            <div>
              <label className="block text-[13px] font-medium text-zinc-500">Status</label>
              <select
                name="status"
                defaultValue="Draft"
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
              >
                {EXSUM_STATUS_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Buat Laporan &amp; Isi Data
              </button>
            </div>
          </form>
          <p className="mt-3 text-[12px] text-zinc-400">
            Laporan baru dimulai kosong. Untuk melanjutkan dari laporan bulan sebelumnya, buka laporan
            tsb lalu pilih &quot;Duplikat ke bulan baru&quot;.
          </p>
        </div>
      )}
    </FormPageShell>
  );
}
