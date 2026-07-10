import { submitBagianD } from "@/actions/quick-screen-proyek";

const FIELDS = [
  { name: "faktorPendorong", label: "Faktor pendorong (strength)" },
  { name: "faktorRisiko", label: "Faktor risiko (red flag)" },
  { name: "dataDibutuhkanOft", label: "Data/dokumen yang dibutuhkan untuk OFT" },
  { name: "urgensiTenggat", label: "Urgensi & tenggat" },
] as const;

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

      {FIELDS.map(({ name, label }) => (
        <div key={name}>
          <label htmlFor={name} className="block text-[13px] font-medium text-zinc-500">
            {label}
          </label>
          <textarea
            id={name}
            name={name}
            required
            rows={3}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
      ))}

      <button
        type="submit"
        className="mt-1 w-fit rounded-full bg-zinc-900 px-5 py-3 text-[15px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
      >
        Ajukan untuk Approval Manajer
      </button>
    </form>
  );
}
