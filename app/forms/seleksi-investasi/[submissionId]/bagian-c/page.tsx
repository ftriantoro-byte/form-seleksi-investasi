import { createClient } from "@/lib/supabase/server";
import { BagianCForm, type RubrikKriteria } from "@/components/forms/seleksi-investasi/BagianCForm";
import { SCORING_CRITERIA, type ScoringKode } from "@/lib/forms/seleksi-investasi/schema";

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
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-gray-600">
          Proposal tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </main>
    );
  }

  if (submission.status === "draft" || submission.status === "tidak_lulus_gate") {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-gray-600">
          Proposal ini belum lulus kriteria gugur (gate), Bagian C belum bisa diakses.
        </p>
      </main>
    );
  }

  if (submission.status !== "menunggu_skoring") {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Seleksi Awal Proposal Investasi</h1>
        <p className="mt-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          Bagian C untuk proposal ini sudah diselesaikan dan sudah lanjut ke tahap
          berikutnya. Lihat status lengkap di dashboard (sedang dibangun, tahap 4.4).
        </p>
      </main>
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
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Seleksi Awal Proposal Investasi</h1>
      <p className="mt-1 text-sm text-gray-600">Bagian C &mdash; Skoring Berbobot</p>

      <BagianCForm
        submissionId={submission.id}
        rubrik={rubrik}
        nilaiAwal={submission.data.bagianC}
        error={error}
      />
    </main>
  );
}
