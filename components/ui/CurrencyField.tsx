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
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mt-1 flex items-center rounded-md border border-gray-300 px-3">
        <span className="text-sm text-gray-500">Rp</span>
        <input
          id={name}
          type="text"
          inputMode="numeric"
          value={tampilan}
          onChange={(e) => setTampilan(formatRibuan(e.target.value))}
          required={required}
          className="w-full border-0 px-2 py-2 text-sm focus:outline-none focus:ring-0"
        />
      </div>
      {/* Nilai murni tanpa pemisah ribuan yang benar-benar dikirim ke server. */}
      <input type="hidden" name={name} value={tampilan.replace(/\D/g, "")} />
    </div>
  );
}
