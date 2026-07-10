import { createClient } from "@/lib/supabase/server";
import { BagianCForm, type RubrikKriteria } from "@/components/forms/seleksi-investasi/BagianCForm";
import { SCORING_CRITERIA, type ScoringKode } from "@/lib/forms/seleksi-investasi/schema";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { StepIndicator } from "@/components/ui/StepIndicator";

type BagianCTersimpan = Record<ScoringKode, { skor: number; justifikasi: string }>;

type SubmissionRow = {
  id: string;
  status: string;
  data: { bagianC?: BagianCTersimpan };
};

type RubricRow = {
  kriteria_kode: string;
  skor_level: 1 | 3 | 5;
  deskripsi: string;
  validasi_minimum: string;
};

export default async function BagianCPage({
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

  if (submission.status === "draft" || submission.status === "tidak_lulus_gate") {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Proposal ini belum lulus kriteria gugur (gate), Bagian C belum bisa diakses.
        </p>
      </FormPageShell>
    );
  }

  if (submission.status !== "menunggu_skoring") {
    return (
      <FormPageShell>
        <FormPageHeader title="Seleksi Awal Proposal Investasi" />
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
          <p className="text-[14px] text-emerald-800">
            Bagian C untuk proposal ini sudah diselesaikan dan sudah lanjut ke tahap
            berikutnya. Lihat status lengkap di dashboard.
          </p>
        </div>
      </FormPageShell>
    );
  }

  const { data: rubrikRows } = await supabase
    .from("scoring_rubrics")
    .select("kriteria_kode, skor_level, deskripsi, validasi_minimum")
    .returns<RubricRow[]>();

  const rubrik = {} as Record<ScoringKode, RubrikKriteria>;
  for (const { kode } of SCORING_CRITERIA) {
    const baris = (rubrikRows ?? []).filter((r) => r.kriteria_kode === kode);
    rubrik[kode] = {
      skor1: baris.find((r) => r.skor_level === 1)?.deskripsi ?? "-",
      skor3: baris.find((r) => r.skor_level === 3)?.deskripsi ?? "-",
      skor5: baris.find((r) => r.skor_level === 5)?.deskripsi ?? "-",
      validasiMinimum: baris.find((r) => r.skor_level === 1)?.validasi_minimum ?? "-",
    };
  }

  return (
    <FormPageShell maxWidth="max-w-3xl">
      <FormPageHeader
        title="Seleksi Awal Proposal Investasi"
        subtitle="Bagian C — Skoring Berbobot"
      />
      <StepIndicator current="C" />

      <BagianCForm
        submissionId={submission.id}
        rubrik={rubrik}
        nilaiAwal={submission.data.bagianC}
        error={error}
      />
    </FormPageShell>
  );
}
