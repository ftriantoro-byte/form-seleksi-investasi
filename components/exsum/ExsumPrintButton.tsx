"use client";

export function ExsumPrintButton() {
  return (
    <button
      type="button"
      onClick={() => {
        // `document.fonts.ready` DULU sebelum print - kalau tidak, `window.print()`
        // bisa mengambil snapshot SEBELUM IBM Plex Sans (font body, dipakai hampir
        // semua teks isi) selesai di-download, jatuh ke fallback ArialMT yang lebih
        // lebar → wrapping teks berubah → kalibrasi pas-2-halaman jebol jadi lebih
        // banyak halaman (ketauan dari PDF cetak sungguhan user, font ArialMT
        // tercetak, bukan IBM Plex Sans, meski IBM Plex Mono/Barlow Condensed OK).
        document.fonts.ready.then(() => window.print());
      }}
      className="rounded-full bg-zinc-100 px-4 py-1.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
    >
      🖨️ Cetak
    </button>
  );
}
