"use client";

import { useState } from "react";
import { SCORING_CRITERIA, type ScoringKode } from "@/lib/forms/seleksi-investasi/schema";
import { nilaiTertimbang, hitungTotalSkor } from "@/lib/forms/seleksi-investasi/utils";
import { submitBagianC } from "@/actions/submissions";

export type RubrikKriteria = {
  skor1: string;
  skor3: string;
  skor5: string;
  validasiMinimum: string;
};

type NilaiAwal = Partial<Record<ScoringKode, { skor: number; justifikasi: string }>>;

export function BagianCForm({
  submissionId,
  rubrik,
  nilaiAwal,
  error,
}: {
  submissionId: string;
  rubrik: Record<ScoringKode, RubrikKriteria>;
  nilaiAwal?: NilaiAwal;
  error?: string;
}) {
  const [skor, setSkor] = useState<Partial<Record<ScoringKode, number>>>(() => {
    const awal: Partial<Record<ScoringKode, number>> = {};
    for (const { kode } of SCORING_CRITERIA) {
      if (nilaiAwal?.[kode]) awal[kode] = nilaiAwal[kode]!.skor;
    }
    return awal;
  });
  const [rubrikTerbuka, setRubrikTerbuka] = useState<ScoringKode | null>(null);

  const total = hitungTotalSkor(skor);

  return (
    <form action={submitBagianC} className="mt-6 flex flex-col gap-6">
      <input type="hidden" name="submissionId" value={submissionId} />

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {SCORING_CRITERIA.map(({ kode, label, bobot }) => {
        const skorSaatIni = skor[kode];
        const info = rubrik[kode];

        return (
          <fieldset key={kode} className="rounded-lg border border-gray-200 p-4">
            <legend className="flex w-full items-center justify-between gap-2 px-1 text-sm font-medium text-gray-700">
              <span>
                {kode}: {label} <span className="text-gray-400">(bobot {bobot.toFixed(2)})</span>
              </span>
              <button
                type="button"
                onClick={() => setRubrikTerbuka((prev) => (prev === kode ? null : kode))}
                aria-label={`Lihat rubrik skoring ${kode}`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-400 text-xs text-gray-600 hover:bg-gray-100"
              >
                ?
              </button>
            </legend>

            {rubrikTerbuka === kode && (
              <div className="mt-2 rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                <p>
                  <span className="font-semibold">Skor 1 (buruk):</span> {info.skor1}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Skor 3 (cukup):</span> {info.skor3}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Skor 5 (sangat baik):</span> {info.skor5}
                </p>
                <p className="mt-1 text-gray-500">
                  <span className="font-semibold">Validasi minimum:</span>{" "}
                  {info.validasiMinimum}
                </p>
                <p className="mt-1 italic text-gray-400">
                  Skor 2 = kondisi antara skor 1 dan 3; skor 4 = kondisi antara skor 3 dan 5.
                </p>
              </div>
            )}

            <div className="mt-3 flex gap-4">
              {[1, 2, 3, 4, 5].map((nilai) => (
                <label key={nilai} className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name={`${kode}_skor`}
                    value={nilai}
                    required
                    defaultChecked={skorSaatIni === nilai}
                    onChange={() => setSkor((prev) => ({ ...prev, [kode]: nilai }))}
                  />
                  {nilai}
                </label>
              ))}
            </div>

            <textarea
              name={`${kode}_justifikasi`}
              required
              defaultValue={nilaiAwal?.[kode]?.justifikasi}
              placeholder="Justifikasi & sumber data"
              rows={2}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />

            <p className="mt-1 text-xs text-gray-500">
              Nilai tertimbang: {skorSaatIni ? nilaiTertimbang(kode, skorSaatIni).toFixed(2) : "-"}
            </p>
          </fieldset>
        );
      })}

      <div className="rounded-lg bg-gray-900 px-4 py-3 text-white">
        <p className="text-sm">Total skor tertimbang</p>
        <p className="text-2xl font-semibold">{total.toFixed(2)} / 5.00</p>
      </div>

      <button
        type="submit"
        className="mt-2 w-fit rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Simpan Bagian C
      </button>
    </form>
  );
}
