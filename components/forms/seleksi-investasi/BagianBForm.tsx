"use client";

import { useState } from "react";
import { GATE_CRITERIA, type GateKode } from "@/lib/forms/seleksi-investasi/schema";
import { submitBagianB } from "@/actions/submissions";

type Jawaban = "ya" | "tidak" | undefined;

const JAWABAN_AWAL: Record<GateKode, Jawaban> = {
  G1: undefined,
  G2: undefined,
  G3: undefined,
  G4: undefined,
  G5: undefined,
  G6: undefined,
};

export function BagianBForm({
  submissionId,
  error,
}: {
  submissionId: string;
  error?: string;
}) {
  const [jawaban, setJawaban] = useState<Record<GateKode, Jawaban>>(JAWABAN_AWAL);

  const adaTidak = Object.values(jawaban).some((j) => j === "tidak");
  const semuaYa = GATE_CRITERIA.every(({ kode }) => jawaban[kode] === "ya");

  const badge = adaTidak
    ? { teks: "Tidak Lulus", kelas: "bg-red-50 text-red-600" }
    : semuaYa
      ? { teks: "Lulus Gate", kelas: "bg-emerald-50 text-emerald-600" }
      : { teks: "Belum lengkap", kelas: "bg-zinc-100 text-zinc-500" };

  return (
    <form action={submitBagianB} className="flex flex-col gap-5">
      <input type="hidden" name="submissionId" value={submissionId} />

      <div className="sticky top-4 z-10 flex justify-start">
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold shadow-sm ring-1 ring-black/[0.03] transition-colors duration-300 ${badge.kelas}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
          {badge.teks}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">{error}</p>
      )}

      {GATE_CRITERIA.map(({ kode, label }) => (
        <fieldset
          key={kode}
          className="rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
        >
          <legend className="px-1 text-[14px] font-medium text-zinc-700">
            <span className="text-zinc-400">{kode}</span> &nbsp;{label}
          </legend>
          <div className="mt-3 flex gap-2.5">
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-[14px] font-medium text-zinc-600 transition-colors duration-150 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white">
              <input
                type="radio"
                name={`${kode}_jawaban`}
                value="ya"
                required
                className="sr-only"
                onChange={() => setJawaban((prev) => ({ ...prev, [kode]: "ya" }))}
              />
              Ya
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-[14px] font-medium text-zinc-600 transition-colors duration-150 has-[:checked]:border-red-500 has-[:checked]:bg-red-500 has-[:checked]:text-white">
              <input
                type="radio"
                name={`${kode}_jawaban`}
                value="tidak"
                className="sr-only"
                onChange={() => setJawaban((prev) => ({ ...prev, [kode]: "tidak" }))}
              />
              Tidak
            </label>
          </div>
          <textarea
            name={`${kode}_catatan`}
            required
            placeholder="Bukti/catatan"
            rows={2}
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 shadow-sm outline-none transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
          />
        </fieldset>
      ))}

      <button
        type="submit"
        className="mt-1 w-fit rounded-full bg-zinc-900 px-5 py-3 text-[15px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
      >
        Simpan Bagian B
      </button>
    </form>
  );
}
