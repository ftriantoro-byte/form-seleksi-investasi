import Link from "next/link";

export default function SeleksiInvestasiPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Seleksi Awal Proposal Investasi</h1>
      <p className="mt-2 text-gray-600">
        Seleksi awal proposal investasi: kriteria gugur, skoring berbobot, dan
        approval bertingkat (Manajer → VP → Direksi).
      </p>
      <Link
        href="/forms/seleksi-investasi/baru"
        className="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Buat proposal baru
      </Link>
    </main>
  );
}
