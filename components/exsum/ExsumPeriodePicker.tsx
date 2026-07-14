"use client";

import { useState } from "react";
import { BULAN_LIST, formatPeriode, formatNoDok } from "@/lib/exsum/periode";

const inputCls =
  "mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10";
const labelCls = "block text-[13px] font-medium text-zinc-500";

// Dipakai di form "Buat Laporan Baru" & "Duplikat" (Server Component,
// submit lewat <form action={serverAction}> biasa) - render input
// name="periode"/name="noDok" biasa jadi Server Action tetap baca lewat
// FormData persis seperti sebelumnya, cuma NILAI-nya sekarang diturunkan
// dari pilihan Bulan+Tahun (bukan diketik bebas), sesuai catatan user
// laporan ini rutin dibuat 1x/bulan.
export function ExsumPeriodePicker({
  defaultBulan,
  defaultTahun,
}: {
  defaultBulan?: number;
  defaultTahun?: number;
}) {
  const now = new Date();
  const [bulan, setBulan] = useState(defaultBulan ?? now.getMonth());
  const [tahun, setTahun] = useState(defaultTahun ?? now.getFullYear());
  const [noDok, setNoDok] = useState(formatNoDok(defaultBulan ?? now.getMonth(), defaultTahun ?? now.getFullYear()));

  function handleBulanChange(newBulan: number) {
    setBulan(newBulan);
    setNoDok(formatNoDok(newBulan, tahun));
  }
  function handleTahunChange(newTahun: number) {
    setTahun(newTahun);
    setNoDok(formatNoDok(bulan, newTahun));
  }

  return (
    <>
      <div>
        <label className={labelCls}>Periode</label>
        <div className="mt-1.5 flex gap-2">
          <select
            className={`${inputCls} mt-0`}
            value={bulan}
            onChange={(e) => handleBulanChange(Number(e.target.value))}
          >
            {BULAN_LIST.map((b, i) => (
              <option key={b} value={i}>
                {b}
              </option>
            ))}
          </select>
          <input
            type="number"
            className={`${inputCls} mt-0 w-28 shrink-0`}
            value={tahun}
            onChange={(e) => handleTahunChange(Number(e.target.value) || tahun)}
          />
        </div>
        <input type="hidden" name="periode" value={formatPeriode(bulan, tahun)} />
      </div>
      <div>
        <label className={labelCls}>No. Dokumen</label>
        <input
          name="noDok"
          className={inputCls}
          value={noDok}
          onChange={(e) => setNoDok(e.target.value)}
        />
      </div>
    </>
  );
}
