import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/supabase/role";
import {
  suggestNomorRegistrasi,
  tambahHariKerja,
  hariIniWib,
} from "@/lib/forms/seleksi-investasi/utils";
import { BagianAForm } from "@/components/forms/seleksi-investasi/BagianAForm";

export default async function FormBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const role = await getCurrentUserRole();

  if (role !== "evaluator") {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p className="text-sm text-gray-600">
          Hanya role Evaluator yang bisa membuat proposal baru.
        </p>
      </main>
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
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Seleksi Awal Proposal Investasi</h1>
      <p className="mt-1 text-sm text-gray-600">Bagian A &mdash; Identitas Proposal</p>

      <BagianAForm
        nomorRegistrasiDefault={nomorRegistrasiDefault}
        tanggalDiterimaDefault={hariIni}
        targetSelesaiDefault={tambahHariKerja(hariIni, 5)}
        evaluatorPicDefault={user?.user_metadata?.full_name ?? user?.email ?? ""}
        error={error}
      />
    </main>
  );
}
