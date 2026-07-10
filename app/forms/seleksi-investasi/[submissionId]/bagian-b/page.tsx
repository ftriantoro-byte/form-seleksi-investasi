import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BagianBForm } from "@/components/forms/seleksi-investasi/BagianBForm";
import { GATE_CRITERIA, type GateKode } from "@/lib/forms/seleksi-investasi/schema";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { StepIndicator } from "@/components/ui/StepIndicator";

type BagianBTersimpan = Record<GateKode, { jawaban: "ya" | "tidak"; catatan: string }>;

type SubmissionRow = {
  id: string;
  status: string;
  data: { bagianB?: BagianBTersimpan };
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
    .select("id, status, data")
    .eq("id", submissionId)
    .single<SubmissionRow>();

  if (!submission) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Proposal tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  if (submission.status === "tidak_lulus_gate") {
    const bagianB = submission.data.bagianB;

    return (
      <FormPageShell>
        <FormPageHeader title="Seleksi Awal Proposal Investasi" />
        <div className="rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1.5 text-[13px] font-semibold tracking-wide text-red-600">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            TIDAK DILANJUTKAN
          </div>
          <p className="mt-3 text-[14px] text-zinc-500">
            Proposal tidak lulus kriteria gugur (gate). Rincian per kriteria:
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {GATE_CRITERIA.map(({ kode, label }) => {
              const jawaban = bagianB?.[kode];
              const gagal = jawaban?.jawaban === "tidak";
              return (
                <li
                  key={kode}
                  className={`rounded-2xl border p-4 ${gagal ? "border-red-100 bg-red-50/40" : "border-zinc-100 bg-zinc-50/50"}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        gagal ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                      }`}
                    >
                      {gagal ? "✕" : "✓"}
                    </span>
                    <div>
                      <p className="text-[14px] font-medium text-zinc-700">
                        {kode}: {label}
                      </p>
                      {jawaban?.catatan && (
                        <p className="mt-1 text-[13px] text-zinc-500">{jawaban.catatan}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </FormPageShell>
    );
  }

  if (submission.status !== "draft") {
    return (
      <FormPageShell>
        <FormPageHeader title="Seleksi Awal Proposal Investasi" />
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
          <p className="text-[14px] text-emerald-800">
            Proposal ini sudah lulus gate dan lanjut ke tahap skoring.
          </p>
          <Link
            href={`/forms/seleksi-investasi/${submission.id}/bagian-c`}
            className="mt-4 inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
          >
            Lanjut ke Bagian C
          </Link>
        </div>
      </FormPageShell>
    );
  }

  return (
    <FormPageShell>
      <FormPageHeader
        title="Seleksi Awal Proposal Investasi"
        subtitle="Bagian B — Kriteria Gugur (Gate)"
      />
      <StepIndicator current="B" />
      <BagianBForm submissionId={submission.id} error={error} />
    </FormPageShell>
  );
}
