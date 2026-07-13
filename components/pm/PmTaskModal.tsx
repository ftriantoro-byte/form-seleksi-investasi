"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Pola resmi Next.js utk menutup modal @modal+intercepting-route adalah
// router.back() (lihat node_modules/next/dist/docs/.../parallel-routes.md).
// Sempat dicoba ganti ke router.push(closeHref) supaya deterministik, tapi
// itu butuh route catch-all di slot @modal utk membersihkan slot pas soft
// navigation - dan catch-all itu bikin Turbopack dev server error saat
// mencocokkan intercepting route ("Invalid interception route"). Jadi balik
// ke back() sesuai dokumentasi resmi; jalan keluar utk kasus modal nyasar
// (mis. Task tidak ditemukan) ditangani lewat link "Kembali ke List" di
// PmTaskDetailContent, bukan di sini.
export function PmTaskModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.back();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

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
