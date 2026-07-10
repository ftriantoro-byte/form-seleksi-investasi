import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getHasilQuickScreen } from "@/lib/forms/quick-screen-proyek/utils";
import { STEPS } from "@/lib/forms/quick-screen-proyek/labels";
import { BagianDForm } from "@/components/forms/quick-screen-proyek/BagianDForm";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { StepIndicator } from "@/components/ui/StepIndicator";

export default async function BagianDPage({
  params,
  searchParams,
}: {
  params: Promise<{ submissionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { submissionId } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("submissions")
    .select("id, status, total_skor")
    .eq("id", submissionId)
    .single();

  if (!submission) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Screening tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  if (submission.status === "draft" && submission.total_skor == null) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">Selesaikan Bagian C (penilaian) terlebih dahulu.</p>
        <Link
          href={`/forms/quick-screen-proyek/${submissionId}/bagian-c`}
          className="mt-5 inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
        >
          Ke Bagian C
        </Link>
      </FormPageShell>
    );
  }

  if (submission.status !== "draft") {
    return (
      <FormPageShell>
        <FormPageHeader title="Quick Screen Proyek" />
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
          <p className="text-[14px] text-emerald-800">
            Bagian D untuk screening ini sudah difinalisasi.
          </p>
          <Link
            href={`/forms/quick-screen-proyek/${submissionId}`}
            className="mt-4 inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
          >
            Lihat detail &amp; status approval
          </Link>
        </div>
      </FormPageShell>
    );
  }

  const hasil = getHasilQuickScreen(submission.total_skor!);

  return (
    <FormPageShell>
      <FormPageHeader title="Quick Screen Proyek" subtitle="Bagian D — Catatan Analis" />
      <StepIndicator current="D" steps={STEPS} />

      <div className="mb-6 rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${hasil.kelas}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
          {hasil.label}
        </div>
        <p className="mt-2.5 text-[14px] text-zinc-500">
          Total skor:{" "}
          <span className="font-medium text-zinc-700">{submission.total_skor} / 60</span>
        </p>
      </div>

      <BagianDForm submissionId={submission.id} error={error} />
    </FormPageShell>
  );
}
