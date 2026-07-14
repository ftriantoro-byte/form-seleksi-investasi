"use client";

export function ExsumPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-zinc-100 px-4 py-1.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
    >
      🖨️ Cetak
    </button>
  );
}
