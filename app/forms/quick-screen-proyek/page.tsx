import Link from "next/link";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";

export default function QuickScreenProyekPage() {
  return (
    <FormPageShell>
      <FormPageHeader
        title="Quick Screen Proyek"
        subtitle="Screening cepat 4 dimensi (Pasar, Teknis, Legal, Skema & Finansial) sebelum masuk proses seleksi investasi formal."
        backHref="/"
        backLabel="Semua form"
      />
      <Link
        href="/forms/quick-screen-proyek/baru"
        className="inline-flex items-center rounded-full bg-zinc-900 px-5 py-3 text-[15px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
      >
        Mulai Screening Baru
      </Link>
    </FormPageShell>
  );
}
