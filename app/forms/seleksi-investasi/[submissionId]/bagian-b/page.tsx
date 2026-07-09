export default async function BagianBPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Seleksi Awal Proposal Investasi</h1>
      <p className="mt-1 text-sm text-gray-600">Bagian B &mdash; Kriteria Gugur (Gate)</p>
      <p className="mt-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Bagian A untuk proposal ini sudah tersimpan (ID: {submissionId}). Bagian B
        sedang dibangun &mdash; lihat PROGRESS.md tahap 2.1.
      </p>
    </main>
  );
}
