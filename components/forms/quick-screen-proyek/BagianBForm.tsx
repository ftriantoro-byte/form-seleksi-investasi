"use client";

import { SKEMA_KERJASAMA_OPTIONS } from "@/lib/forms/quick-screen-proyek/schema";
import { submitBagianB } from "@/actions/quick-screen-proyek";

export function BagianBForm({
  submissionId,
  error,
}: {
  submissionId: string;
  error?: string;
}) {
  return (
    <form action={submitBagianB} className="flex flex-col gap-5">
      <input type="hidden" name="submissionId" value={submissionId} />

      {error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">{error}</p>
      )}

      <p className="text-[13px] text-zinc-500">
        Tandai skema kerjasama yang relevan untuk proyek ini. Catatan bersifat opsional.
      </p>

      {SKEMA_KERJASAMA_OPTIONS.map(({ kode, label }) => (
        <fieldset
          key={kode}
          className="rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
        >
          <legend className="px-1 text-[14px] font-medium text-zinc-700">{label}</legend>
          <div className="mt-3 flex gap-2.5">
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-[14px] font-medium text-zinc-600 transition-colors duration-150 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white">
              <input
                type="radio"
                name={`${kode}_dipilih`}
                value="ya"
                required
                className="sr-only"
              />
              Ya
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-[14px] font-medium text-zinc-600 transition-colors duration-150 has-[:checked]:border-zinc-300 has-[:checked]:bg-zinc-100 has-[:checked]:text-zinc-700">
              <input
                type="radio"
                name={`${kode}_dipilih`}
                value="tidak"
                defaultChecked
                className="sr-only"
              />
              Tidak
            </label>
          </div>
          <textarea
            name={`${kode}_catatan`}
            placeholder="Catatan (opsional)"
            rows={2}
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 shadow-sm outline-none transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
          />
        </fieldset>
      ))}

      <button
        type="submit"
        className="mt-1 w-fit rounded-full bg-zinc-900 px-5 py-3 text-[15px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
      >
        Lanjut ke Bagian C
      </button>
    </form>
  );
}
