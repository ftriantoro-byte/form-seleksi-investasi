import { submitBagianD } from "@/actions/submissions";

export function BagianDForm({
  submissionId,
  error,
}: {
  submissionId: string;
  error?: string;
}) {
  return (
    <form
      action={submitBagianD}
      className="flex flex-col gap-5 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9"
    >
      <input type="hidden" name="submissionId" value={submissionId} />

      {error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">{error}</p>
      )}

      <div>
        <label
          htmlFor="catatanEvaluator"
          className="block text-[13px] font-medium text-zinc-500"
        >
          Catatan evaluator / risiko utama yang perlu didalami
        </label>
        <textarea
          id="catatanEvaluator"
          name="catatanEvaluator"
          required
          rows={4}
          className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
        />
      </div>

      <fieldset className="rounded-2xl bg-zinc-50 p-5">
        <legend className="px-1 text-[14px] font-medium text-zinc-700">
          Pernyataan bebas benturan kepentingan
        </legend>
        <p className="mt-1 text-[13px] text-zinc-500">
          Saya menyatakan bahwa evaluasi proposal ini dilakukan bebas dari benturan
          kepentingan.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-600 transition-colors duration-150 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white">
            <input
              type="radio"
              name="pernyataanBebasBenturan"
              value="ya"
              required
              className="sr-only"
            />
            Ya, bebas benturan kepentingan
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-600 transition-colors duration-150 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500 has-[:checked]:text-white">
            <input
              type="radio"
              name="pernyataanBebasBenturan"
              value="tidak"
              className="sr-only"
            />
            Tidak, ada potensi benturan kepentingan
          </label>
        </div>
      </fieldset>

      <button
        type="submit"
        className="mt-1 w-fit rounded-full bg-zinc-900 px-5 py-3 text-[15px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
      >
        Ajukan untuk Approval Manajer
      </button>
    </form>
  );
}
