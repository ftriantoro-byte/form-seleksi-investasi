import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRekomendasi } from "@/lib/forms/seleksi-investasi/utils";
import { BagianDForm } from "@/components/forms/seleksi-investasi/BagianDForm";

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
          Proposal ini belum lulus kriteria gugur (gate), Bagian D belum bisa diakses.
        </p>
      </main>
    );
  }

  if (submission.status === "menunggu_skoring" && submission.total_skor == null) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-gray-600">
          Selesaikan Bagian C (skoring) terlebih dahulu.
        </p>
        <Link
          href={`/forms/seleksi-investasi/${submissionId}/bagian-c`}
          className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Ke Bagian C
        </Link>
      </main>
    );
  }

  if (submission.status !== "menunggu_skoring") {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Seleksi Awal Proposal Investasi</h1>
        <p className="mt-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          Bagian D untuk proposal ini sudah difinalisasi.
        </p>
        <Link
          href={`/forms/seleksi-investasi/${submissionId}`}
          className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Lihat detail &amp; status approval
        </Link>
      </main>
    );
  }

  const rekomendasi = getRekomendasi(submission.total_skor!);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Seleksi Awal Proposal Investasi</h1>
      <p className="mt-1 text-sm text-gray-600">Bagian D &mdash; Hasil &amp; Approval</p>

      <div
        className={`mt-4 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${rekomendasi.kelas}`}
      >
        {rekomendasi.label}
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Total skor tertimbang: {submission.total_skor!.toFixed(2)} / 5.00
      </p>

      <BagianDForm submissionId={submission.id} error={error} />
    </main>
  );
}
