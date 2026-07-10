"use client";

import { useMemo, useState } from "react";
import {
  DIMENSI_LIST,
  SCORING_CRITERIA,
  SKALA_HML,
  type Dimensi,
  type ScoringKode,
} from "@/lib/forms/quick-screen-proyek/schema";
import { hitungSkorDimensi, hitungTotalSkor } from "@/lib/forms/quick-screen-proyek/utils";
import { LABEL_DIMENSI } from "@/lib/forms/quick-screen-proyek/labels";
import { submitBagianC } from "@/actions/quick-screen-proyek";
import { RadarSkorChart } from "./RadarSkorChart";

type NilaiAwal = Partial<Record<ScoringKode, { skor: number; catatan?: string }>>;

export function BagianCForm({
  submissionId,
  nilaiAwal,
  error,
}: {
  submissionId: string;
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

  const totalTerisi = Object.keys(skor).length;
  const total = hitungTotalSkor(skor);
  const perDimensi = hitungSkorDimensi(skor);
  const dataRadar = useMemo(
    () =>
      DIMENSI_LIST.map((dimensi) => ({
        dimensi: LABEL_DIMENSI[dimensi],
        skor: perDimensi[dimensi],
      })),
    [perDimensi],
  );

  return (
    <form action={submitBagianC} className="flex flex-col gap-5 pb-28">
      <input type="hidden" name="submissionId" value={submissionId} />

      {error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">{error}</p>
      )}

      <div className="rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-zinc-400">
          Ringkasan skor per dimensi
        </p>
        <RadarSkorChart data={dataRadar} />
      </div>

      {DIMENSI_LIST.map((dimensi: Dimensi) => (
        <div key={dimensi} className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-zinc-400">
              {LABEL_DIMENSI[dimensi]}
            </h3>
            <span className="text-[12px] font-medium text-zinc-400">
              {perDimensi[dimensi]} / 15
            </span>
          </div>

          {SCORING_CRITERIA.filter((k) => k.dimensi === dimensi).map(({ kode, label }) => {
            const skorSaatIni = skor[kode];
            return (
              <fieldset
                key={kode}
                className="rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
              >
                <legend className="px-1 text-[14px] font-medium text-zinc-700">
                  <span className="text-zinc-400">{kode}</span> &nbsp;{label}
                </legend>

                <div className="mt-3 flex gap-2.5">
                  {SKALA_HML.map(({ nilai, label: hurufLabel }) => (
                    <label
                      key={nilai}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-200 text-[14px] font-medium text-zinc-600 transition-colors duration-150 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white"
                    >
                      <input
                        type="radio"
                        name={`${kode}_skor`}
                        value={nilai}
                        required
                        className="sr-only"
                        defaultChecked={skorSaatIni === nilai}
                        onChange={() => setSkor((prev) => ({ ...prev, [kode]: nilai }))}
                      />
                      {hurufLabel}
                    </label>
                  ))}
                </div>

                <textarea
                  name={`${kode}_catatan`}
                  defaultValue={nilaiAwal?.[kode]?.catatan}
                  placeholder="Catatan (opsional)"
                  rows={2}
                  className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 shadow-sm outline-none transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                />
              </fieldset>
            );
          })}
        </div>
      ))}

      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-6 pb-6">
        <div className="flex w-full max-w-md items-center justify-between rounded-full border border-black/[0.04] bg-white/90 px-6 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              Total skor &middot; {totalTerisi}/20
            </p>
            <p className="text-[20px] font-semibold tracking-tight text-zinc-900">
              {total} <span className="text-[13px] font-normal text-zinc-400">/ 60</span>
            </p>
          </div>
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
          >
            Simpan
          </button>
        </div>
      </div>
    </form>
  );
}
