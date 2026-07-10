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
  const totalTerisi = Object.keys(skor).length;

  return (
    <form action={submitBagianC} className="flex flex-col gap-5 pb-28">
      <input type="hidden" name="submissionId" value={submissionId} />

      {error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">{error}</p>
      )}

      {SCORING_CRITERIA.map(({ kode, label, bobot }) => {
        const skorSaatIni = skor[kode];
        const info = rubrik[kode];
        const rubrikSedangTerbuka = rubrikTerbuka === kode;

        return (
          <fieldset
            key={kode}
            className="rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
          >
            <legend className="flex w-full items-start justify-between gap-3">
              <span className="text-[14px] font-medium text-zinc-700">
                <span className="text-zinc-400">{kode}</span> &nbsp;{label}{" "}
                <span className="whitespace-nowrap text-zinc-400">
                  · bobot {bobot.toFixed(2)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setRubrikTerbuka(rubrikSedangTerbuka ? null : kode)}
                aria-label={`Lihat rubrik skoring ${kode}`}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors duration-150 ${
                  rubrikSedangTerbuka
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                }`}
              >
                ?
              </button>
            </legend>

            {rubrikSedangTerbuka && (
              <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-zinc-50 p-4 text-[13px] leading-relaxed text-zinc-600">
                <p>
                  <span className="font-semibold text-zinc-800">Skor 1 (buruk):</span>{" "}
                  {info.skor1}
                </p>
                <p>
                  <span className="font-semibold text-zinc-800">Skor 3 (cukup):</span>{" "}
                  {info.skor3}
                </p>
                <p>
                  <span className="font-semibold text-zinc-800">Skor 5 (sangat baik):</span>{" "}
                  {info.skor5}
                </p>
                <p className="text-zinc-500">
                  <span className="font-semibold text-zinc-700">Validasi minimum:</span>{" "}
                  {info.validasiMinimum}
                </p>
                <p className="italic text-zinc-400">
                  Skor 2 = kondisi antara skor 1 dan 3; skor 4 = kondisi antara skor 3 dan 5.
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((nilai) => (
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
              className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 shadow-sm outline-none transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            />

            <p className="mt-2 text-[12px] text-zinc-400">
              Nilai tertimbang:{" "}
              <span className="font-medium text-zinc-600">
                {skorSaatIni ? nilaiTertimbang(kode, skorSaatIni).toFixed(2) : "—"}
              </span>
            </p>
          </fieldset>
        );
      })}

      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-6 pb-6">
        <div className="flex w-full max-w-md items-center justify-between rounded-full border border-black/[0.04] bg-white/90 px-6 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              Total skor tertimbang &middot; {totalTerisi}/8
            </p>
            <p className="text-[20px] font-semibold tracking-tight text-zinc-900">
              {total.toFixed(2)}{" "}
              <span className="text-[13px] font-normal text-zinc-400">/ 5.00</span>
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
