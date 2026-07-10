import Link from "next/link";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";

export default function SeleksiInvestasiPage() {
  return (
    <FormPageShell>
      <FormPageHeader
        title="Seleksi Awal Proposal Investasi"
        subtitle="Kriteria gugur, skoring berbobot, dan approval bertingkat (Manajer → VP → Direksi)."
        backHref="/"
        backLabel="Semua form"
      />
      <Link
        href="/forms/seleksi-investasi/baru"
        className="inline-flex items-center rounded-full bg-zinc-900 px-5 py-3 text-[15px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
      >
        Buat proposal baru
      </Link>
    </FormPageShell>
  );
}
