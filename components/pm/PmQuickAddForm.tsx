// Server Component murni (tanpa "use client") - dipakai berulang di
// halaman Workspace/Space/Folder untuk form tambah cepat (nama saja),
// menggantikan kartu besar multi-field yang tadinya dipakai di tiap
// halaman. Field lain (deskripsi dll) diisi belakangan lewat halaman
// Pengaturan entitas itu sendiri setelah dibuat.
export function PmQuickAddForm({
  action,
  hiddenFields,
  placeholder,
  submitLabel,
  primary = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  placeholder: string;
  submitLabel: string;
  primary?: boolean;
}) {
  return (
    <form action={action} className="mb-4 flex items-center gap-2">
      {Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input
        name="nama"
        required
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[14px] text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
      />
      <button
        type="submit"
        className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
          primary
            ? "bg-zinc-900 text-white hover:bg-zinc-700"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
        }`}
      >
        {submitLabel}
      </button>
    </form>
  );
}
