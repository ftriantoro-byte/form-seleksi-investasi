import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BagianBForm } from "@/components/forms/quick-screen-proyek/BagianBForm";
import { STEPS } from "@/lib/forms/quick-screen-proyek/labels";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { StepIndicator } from "@/components/ui/StepIndicator";

type SubmissionRow = {
  id: string;
  status: string;
};

export default async function BagianBPage({
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
    .select("id, status")
    .eq("id", submissionId)
    .single<SubmissionRow>();

  if (!submission) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Screening tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  if (submission.status !== "draft") {
    return (
      <FormPageShell>
        <FormPageHeader title="Quick Screen Proyek" />
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
          <p className="text-[14px] text-emerald-800">
            Screening ini sudah diajukan untuk approval dan tidak bisa diedit lagi.
          </p>
          <Link
            href={`/forms/quick-screen-proyek/${submission.id}`}
            className="mt-4 inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
          >
            Lihat detail
          </Link>
        </div>
      </FormPageShell>
    );
  }

  return (
    <FormPageShell>
      <FormPageHeader title="Quick Screen Proyek" subtitle="Bagian B — Skema Kerjasama" />
      <StepIndicator current="B" steps={STEPS} />
      <BagianBForm submissionId={submission.id} error={error} />
    </FormPageShell>
  );
}
