import { submitBagianD } from "@/actions/submissions";

export function BagianDForm({
  submissionId,
  error,
}: {
  submissionId: string;
  error?: string;
}) {
  return (
    <form action={submitBagianD} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="submissionId" value={submissionId} />

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div>
        <label htmlFor="catatanEvaluator" className="block text-sm font-medium text-gray-700">
          Catatan evaluator / risiko utama yang perlu didalami
        </label>
        <textarea
          id="catatanEvaluator"
          name="catatanEvaluator"
          required
          rows={4}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-gray-700">
          Pernyataan bebas benturan kepentingan
        </legend>
        <p className="mt-1 text-xs text-gray-500">
          Saya menyatakan bahwa evaluasi proposal ini dilakukan bebas dari benturan
          kepentingan.
        </p>
        <div className="mt-2 flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="pernyataanBebasBenturan" value="ya" required />
            Ya, bebas benturan kepentingan
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="pernyataanBebasBenturan" value="tidak" />
            Tidak, ada potensi benturan kepentingan
          </label>
        </div>
      </fieldset>

      <button
        type="submit"
        className="mt-2 w-fit rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Ajukan untuk Approval Manajer
      </button>
    </form>
  );
}
