// Fallback Suspense untuk seluruh navigasi di dalam modul PM yang belum
// punya loading.tsx lebih spesifik di segment-nya sendiri - sebelumnya
// TIDAK ADA loading.tsx sama sekali di sini, jadi tiap pindah halaman
// (List/Task/Dashboard/Meeting/dst) layar kosong penuh sampai data selesai
// diambil. Skeleton ringan ini murni kosmetik, tidak mengubah data/fitur
// apa pun - cuma kelihatan lebih responsif saat menunggu.
export default function PmLoading() {
  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      <main className="mx-auto max-w-4xl animate-pulse px-6 py-14 sm:px-10 sm:py-16">
        <div className="h-4 w-32 rounded bg-zinc-200" />
        <div className="mt-3 h-7 w-64 rounded bg-zinc-200" />
        <div className="mt-8 space-y-3">
          <div className="h-20 rounded-2xl bg-zinc-100" />
          <div className="h-20 rounded-2xl bg-zinc-100" />
          <div className="h-20 rounded-2xl bg-zinc-100" />
        </div>
      </main>
    </div>
  );
}
