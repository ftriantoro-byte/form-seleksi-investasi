import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/supabase/role";
import { suggestNomorDokumen, hariIniWib } from "@/lib/forms/quick-screen-proyek/utils";
import { STEPS } from "@/lib/forms/quick-screen-proyek/labels";
import { BagianAForm } from "@/components/forms/quick-screen-proyek/BagianAForm";
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
          Hanya role Evaluator yang bisa membuat screening baru.
        </p>
      </FormPageShell>
    );
  }

  const supabase = await createClient();

  const { data: form } = await supabase
    .from("forms")
    .select("id")
    .eq("slug", "quick-screen-proyek")
    .single();

  const noDokumenDefault = form
    ? await suggestNomorDokumen(supabase, form.id)
    : `QSP-${new Date().getFullYear()}-001`;

  const hariIni = hariIniWib();

  return (
    <FormPageShell>
      <FormPageHeader
        title="Quick Screen Proyek"
        subtitle="Bagian A — Identitas Proyek"
        backHref="/forms/quick-screen-proyek"
      />
      <StepIndicator current="A" steps={STEPS} />

      <BagianAForm
        noDokumenDefault={noDokumenDefault}
        tanggalDefault={hariIni}
        tanggalInfoDiterimaDefault={hariIni}
        error={error}
      />
    </FormPageShell>
  );
}
