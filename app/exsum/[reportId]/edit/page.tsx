import { createClient } from "@/lib/supabase/server";
import { requireExsumEditor } from "@/lib/exsum/access";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { ExsumEditForm } from "@/components/exsum/ExsumEditForm";
import { EXSUM_BLANK_DATA, type ExsumData } from "@/lib/exsum/types";

export default async function ExsumEditPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  // Akses tulis dibatasi whitelist exsum_editors - lihat catatan di
  // actions/exsum.ts. Dicek jg di sini (bukan cuma di dalam Server Action)
  // supaya non-editor tidak sempat melihat form edit sama sekali, langsung
  // dialihkan ke error.
  await requireExsumEditor();

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("exsum_reports")
    .select("id, perusahaan, kode, periode, no_dok, status, data")
    .eq("id", reportId)
    .single();

  if (!report) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Laporan tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  return (
    <FormPageShell maxWidth="max-w-5xl">
      <FormPageHeader
        title={`Edit Laporan · ${report.periode}`}
        subtitle={`${report.perusahaan} (${report.kode}) · ${report.no_dok}`}
        backHref={`/exsum/${reportId}`}
        backLabel="Kembali ke Laporan"
      />
      <ExsumEditForm
        reportId={report.id}
        meta={{
          perusahaan: report.perusahaan,
          kode: report.kode,
          periode: report.periode,
          noDok: report.no_dok,
          status: report.status as "Draft" | "Final",
        }}
        initialData={(report.data as ExsumData) ?? EXSUM_BLANK_DATA}
      />
    </FormPageShell>
  );
}
