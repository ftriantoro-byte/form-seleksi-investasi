import { createClient } from "@/lib/supabase/server";
import { BagianBForm } from "@/components/forms/seleksi-investasi/BagianBForm";
import { GATE_CRITERIA, type GateKode } from "@/lib/forms/seleksi-investasi/schema";

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
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-gray-600">
          Proposal tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </main>
    );
  }

  if (submission.status === "tidak_lulus_gate") {
    const bagianB = submission.data.bagianB;

    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Seleksi Awal Proposal Investasi</h1>
        <div className="mt-4 inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
          TIDAK DILANJUTKAN
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Proposal tidak lulus kriteria gugur (gate). Rincian per kriteria:
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {GATE_CRITERIA.map(({ kode, label }) => {
            const jawaban = bagianB?.[kode];
            const gagal = jawaban?.jawaban === "tidak";
            return (
              <li key={kode} className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-700">
                  {kode}: {label}
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${gagal ? "text-red-700" : "text-green-700"}`}
                >
                  {gagal ? "Tidak" : "Ya"}
                </p>
                {jawaban?.catatan && (
                  <p className="mt-1 text-sm text-gray-600">{jawaban.catatan}</p>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    );
  }

  if (submission.status !== "draft") {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Seleksi Awal Proposal Investasi</h1>
        <p className="mt-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          Proposal ini sudah lulus gate dan lanjut ke tahap skoring (Bagian C &mdash;
          sedang dibangun, lihat PROGRESS.md tahap 3.1).
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Seleksi Awal Proposal Investasi</h1>
      <p className="mt-1 text-sm text-gray-600">Bagian B &mdash; Kriteria Gugur (Gate)</p>
      <BagianBForm submissionId={submission.id} error={error} />
    </main>
  );
}
