import { createClient } from "@/lib/supabase/server";

export default async function BagianDPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("submissions")
    .select("total_skor")
    .eq("id", submissionId)
    .single();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Seleksi Awal Proposal Investasi</h1>
      <p className="mt-1 text-sm text-gray-600">Bagian D &mdash; Hasil &amp; Approval</p>
      <p className="mt-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Bagian C untuk proposal ini sudah tersimpan
        {submission?.total_skor != null && (
          <> (total skor tertimbang {Number(submission.total_skor).toFixed(2)})</>
        )}
        . Bagian D &mdash; rekomendasi otomatis &amp; alur approval &mdash; sedang dibangun,
        lihat PROGRESS.md tahap 4.1-4.3.
      </p>
    </main>
  );
}
