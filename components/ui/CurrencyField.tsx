"use client";

import { useState } from "react";

type CurrencyFieldProps = {
  label: string;
  name: string;
  defaultValue?: number;
  required?: boolean;
};

function formatRibuan(value: string): string {
  const angka = value.replace(/\D/g, "");
  if (!angka) return "";
  return new Intl.NumberFormat("id-ID").format(Number(angka));
}

export function CurrencyField({
  label,
  name,
  defaultValue,
  required = true,
}: CurrencyFieldProps) {
  const [tampilan, setTampilan] = useState(
    defaultValue ? formatRibuan(String(defaultValue)) : "",
  );

  return (
    <div>
      <label
        htmlFor={name}
        className="block text-[13px] font-medium text-zinc-500"
      >
        {label}
      </label>
      <div className="mt-1.5 flex items-center rounded-xl border border-zinc-200 bg-white px-4 shadow-sm transition-all duration-150 hover:border-zinc-300 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10">
        <span className="text-[15px] text-zinc-400">Rp</span>
        <input
          id={name}
          type="text"
          inputMode="numeric"
          value={tampilan}
          onChange={(e) => setTampilan(formatRibuan(e.target.value))}
          required={required}
          className="w-full border-0 bg-transparent px-2 py-2.5 text-[15px] text-zinc-900 outline-none"
        />
      </div>
      {/* Nilai murni tanpa pemisah ribuan yang benar-benar dikirim ke server. */}
      <input type="hidden" name={name} value={tampilan.replace(/\D/g, "")} />
    </div>
  );
}
