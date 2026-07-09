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
    ? { teks: "Tidak Lulus", kelas: "bg-red-100 text-red-800" }
    : semuaYa
      ? { teks: "Lulus Gate", kelas: "bg-green-100 text-green-800" }
      : { teks: "Belum lengkap", kelas: "bg-gray-100 text-gray-600" };

  return (
    <form action={submitBagianB} className="mt-6 flex flex-col gap-6">
      <input type="hidden" name="submissionId" value={submissionId} />

      <div
        className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-medium ${badge.kelas}`}
      >
        {badge.teks}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {GATE_CRITERIA.map(({ kode, label }) => (
        <fieldset key={kode} className="rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-medium text-gray-700">
            {kode}: {label}
          </legend>
          <div className="mt-2 flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${kode}_jawaban`}
                value="ya"
                required
                onChange={() => setJawaban((prev) => ({ ...prev, [kode]: "ya" }))}
              />
              Ya
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${kode}_jawaban`}
                value="tidak"
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
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </fieldset>
      ))}

      <button
        type="submit"
        className="mt-2 w-fit rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Simpan Bagian B
      </button>
    </form>
  );
}
