import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/supabase/role";
import {
  suggestNomorRegistrasi,
  tambahHariKerja,
  hariIniWib,
} from "@/lib/forms/seleksi-investasi/utils";
import { BagianAForm } from "@/components/forms/seleksi-investasi/BagianAForm";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { StepIndicator } from "@/components/ui/StepIndicator";

export default async function FormBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const role = await getCurrentUserRole();

  if (role !== "evaluator") {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Hanya role Evaluator yang bisa membuat proposal baru.
        </p>
      </FormPageShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: form } = await supabase
    .from("forms")
    .select("id")
    .eq("slug", "seleksi-investasi")
    .single();

  const nomorRegistrasiDefault = form
    ? await suggestNomorRegistrasi(supabase, form.id)
    : `PRP-${new Date().getFullYear()}-001`;

  const hariIni = hariIniWib();

  return (
    <FormPageShell>
      <FormPageHeader
        title="Seleksi Awal Proposal Investasi"
        subtitle="Bagian A — Identitas Proposal"
        backHref="/forms/seleksi-investasi"
      />
      <StepIndicator current="A" />

      <BagianAForm
        nomorRegistrasiDefault={nomorRegistrasiDefault}
        tanggalDiterimaDefault={hariIni}
        targetSelesaiDefault={tambahHariKerja(hariIni, 5)}
        evaluatorPicDefault={user?.user_metadata?.full_name ?? user?.email ?? ""}
        error={error}
      />
    </FormPageShell>
  );
}
