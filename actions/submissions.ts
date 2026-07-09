"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/role";
import { bagianASchema } from "@/lib/forms/seleksi-investasi/schema";

export async function buatSubmissionBagianA(formData: FormData) {
  await requireRole("evaluator");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const parsed = bagianASchema.safeParse({
    nomorRegistrasi: formData.get("nomorRegistrasi"),
    tanggalDiterima: formData.get("tanggalDiterima"),
    namaProyek: formData.get("namaProyek"),
    lokasiProyek: formData.get("lokasiProyek"),
    namaPengusul: formData.get("namaPengusul"),
    sumberProposal: formData.get("sumberProposal"),
    skemaKerjasama: formData.get("skemaKerjasama"),
    estimasiNilaiInvestasi: formData.get("estimasiNilaiInvestasi"),
    evaluatorPic: formData.get("evaluatorPic"),
    targetSelesai: formData.get("targetSelesai"),
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`/forms/seleksi-investasi/baru?error=${encodeURIComponent(pesan)}`);
  }

  const { data: form } = await supabase
    .from("forms")
    .select("id")
    .eq("slug", "seleksi-investasi")
    .single();

  if (!form) {
    return redirect(
      `/forms/seleksi-investasi/baru?error=${encodeURIComponent(
        "Form seleksi-investasi belum terdaftar di database.",
      )}`,
    );
  }

  const { data: submission, error } = await supabase
    .from("submissions")
    .insert({
      form_id: form.id,
      dibuat_oleh: user.id,
      status: "draft",
      data: { bagianA: parsed.data },
    })
    .select("id")
    .single();

  if (error || !submission) {
    return redirect(
      `/forms/seleksi-investasi/baru?error=${encodeURIComponent(
        error?.message ?? "Gagal menyimpan proposal.",
      )}`,
    );
  }

  redirect(`/forms/seleksi-investasi/${submission.id}/bagian-b`);
}
