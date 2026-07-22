"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Pola resmi Next.js utk menutup modal @modal+intercepting-route adalah
// router.back() (lihat node_modules/next/dist/docs/.../parallel-routes.md).
// Sempat dicoba ganti ke router.push(closeHref) supaya deterministik, tapi
// itu butuh route catch-all di slot @modal utk membersihkan slot pas soft
// navigation - dan catch-all itu bikin Turbopack dev server error saat
// mencocokkan intercepting route ("Invalid interception route"). Jadi balik
// ke back() sesuai dokumentasi resmi; jalan keluar utk kasus modal nyasar
// (mis. Task tidak ditemukan) ditangani lewat link "Kembali ke List" di
// PmTaskDetailContent, bukan di sini.
//
// Bug susulan yang ditemukan (laporan user: pesan "Task tidak ditemukan"
// nongol DUA KALI pas tekan Kembali): `redirect()` dari SERVER ACTION yang
// dipanggil DARI DALAM modal ini (mis. deleteTask - hapus Task lalu
// redirect ke List) TIDAK mengsinkronkan ulang slot paralel @modal -
// dikonfirmasi lewat reproduksi manual (buat Task percobaan, buka modalnya,
// Hapus Task ini dari dalam modal): URL address bar sudah balik ke List,
// TAPI modal ini masih nempel nampilkan form Task yang BARU DIHAPUS (state
// React basi, bukan di-unmount). Sempat dicoba `router.refresh()` sbg
// perbaikan (memaksa Next re-fetch data Server Component slot @modal) -
// ISI-nya memang jadi benar (berubah dari form basi ke "Task tidak
// ditemukan"), TAPI modal-nya SENDIRI tetap tidak ter-unmount (refresh()
// cuma re-fetch data segmen yang SUDAH aktif, bukan menentukan ulang
// segmen mana yang seharusnya aktif) - link "Kembali ke List" di dalamnya
// pun jadi no-op krn hrefnya SAMA PERSIS dgn URL saat ini (Link ke URL yg
// tidak berubah tidak memicu navigasi apapun). Kalau modal basi begini
// ketimpa modal Task lain yang dibuka user berikutnya (nge-stack, krn versi
// lama tak pernah ter-unmount), hasilnya PERSIS gejala yang dilaporkan: 2
// blok pesan "Task tidak ditemukan" + 2 tombol ✕ sekaligus.
//
// PERBAIKAN FINAL: bukan andalkan Next mengsinkronkan ulang slot paralel
// (server-driven, terbukti tidak reliable di atas) - modal ini sendiri yang
// mendeteksi ketidakcocokan (pathname tidak lagi PERSIS PATH yang modal ini
// dibuka utk), lalu berhenti me-render diri sendiri. `dismissed` SENGAJA
// derived langsung saat render (bukan useState+useEffect) - murni fungsi
// dari `pathname` (sudah reaktif lewat usePathname()) & `expectedPath`,
// tidak ada alasan nunggu 1 siklus render tambahan lewat effect. Jaminan
// 100% modal hilang dari layar tanpa bergantung pada bagaimana Next
// memperlakukan slot @modal di baliknya.
//
// `expectedPath` (path LENGKAP /pm/{workspaceId}/{spaceId}/{listId}/{taskId},
// bukan cuma taskId) - sengaja diperkuat dari versi awal yang cuma cek
// `pathname.endsWith('/'+taskId)`, supaya jg mendeteksi kasus moveTask
// (Task dipindah ke List/Space LAIN sementara taskId-nya SAMA - endsWith
// murni taskId tidak akan menangkap ini krn suffix-nya tetap cocok padahal
// rute sesungguhnya sudah pindah ke List/Space berbeda).
export function PmTaskModal({
  expectedPath,
  children,
}: {
  expectedPath: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const dismissed = pathname !== expectedPath;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.back();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-10 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={() => router.back()} aria-hidden />
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#fbfbfd] p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Tutup"
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
