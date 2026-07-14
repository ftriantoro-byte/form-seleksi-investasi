import { createClient } from "@/lib/supabase/server";
import { requireExsumEditor } from "@/lib/exsum/access";
import { duplicateReport } from "@/actions/exsum";
import { EXSUM_STATUS_VALUES } from "@/lib/exsum/schema";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { FormField } from "@/components/ui/FormField";

export default async function ExsumDuplicatePage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { reportId } = await params;
  const { error } = await searchParams;
  await requireExsumEditor();

  const supabase = await createClient();
  const { data: source } = await supabase
    .from("exsum_reports")
    .select("id, perusahaan, kode, periode, no_dok")
    .eq("id", reportId)
    .single();

  if (!source) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Laporan sumber tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  return (
    <FormPageShell maxWidth="max-w-xl">
      <FormPageHeader
        title="Duplikat Laporan"
        subtitle={`Menyalin isi ${source.periode} (${source.no_dok}) sebagai titik awal - isi meta laporan baru di bawah, 7 section datanya akan tersalin persis dan bisa langsung disunting.`}
        backHref={`/exsum/${reportId}`}
        backLabel="Kembali ke Laporan"
      />

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">{error}</p>
      )}

      <div className="rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <form action={duplicateReport} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" name="sourceId" value={reportId} />
          <FormField label="Perusahaan" name="perusahaan" defaultValue={source.perusahaan} />
          <FormField label="Kode" name="kode" defaultValue={source.kode} />
          <FormField label="Periode" name="periode" defaultValue="" />
          <FormField label="No. Dokumen" name="noDok" defaultValue="" />
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
              Duplikat &amp; Lanjut Edit
            </button>
          </div>
        </form>
      </div>
    </FormPageShell>
  );
}
