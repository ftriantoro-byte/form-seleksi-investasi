"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/role";
import {
  bagianASchema,
  bagianBSchema,
  bagianCSchema,
  bagianDSchema,
  SKEMA_KERJASAMA_OPTIONS,
  SCORING_CRITERIA,
} from "@/lib/forms/quick-screen-proyek/schema";
import { hitungTotalSkor } from "@/lib/forms/quick-screen-proyek/utils";

const FORM_SLUG = "quick-screen-proyek";

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
    noDokumen: formData.get("noDokumen"),
    tanggal: formData.get("tanggal"),
    statusDokumen: formData.get("statusDokumen"),
    namaProyek: formData.get("namaProyek"),
    sektorTipologiProyek: formData.get("sektorTipologiProyek"),
    pemilikPemberiInformasi: formData.get("pemilikPemberiInformasi"),
    lokasiProyek: formData.get("lokasiProyek"),
    tanggalInfoDiterima: formData.get("tanggalInfoDiterima"),
    estimasiNilaiProyek: formData.get("estimasiNilaiProyek"),
    sumberInformasi: formData.get("sumberInformasi"),
    deskripsiProyek: formData.get("deskripsiProyek"),
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`/forms/${FORM_SLUG}/baru?error=${encodeURIComponent(pesan)}`);
  }

  const { data: form } = await supabase
    .from("forms")
    .select("id")
    .eq("slug", FORM_SLUG)
    .single();

  if (!form) {
    return redirect(
      `/forms/${FORM_SLUG}/baru?error=${encodeURIComponent(
        `Form ${FORM_SLUG} belum terdaftar di database.`,
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
      `/forms/${FORM_SLUG}/baru?error=${encodeURIComponent(
        error?.message ?? "Gagal menyimpan screening.",
      )}`,
    );
  }

  redirect(`/forms/${FORM_SLUG}/${submission.id}/bagian-b`);
}

export async function submitBagianB(formData: FormData) {
  await requireRole("evaluator");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const submissionId = formData.get("submissionId") as string;

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, status, data")
    .eq("id", submissionId)
    .single();

  if (!submission) {
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}/bagian-b?error=${encodeURIComponent(
        "Screening tidak ditemukan.",
      )}`,
    );
  }

  const mentah: Record<string, unknown> = {};
  for (const { kode } of SKEMA_KERJASAMA_OPTIONS) {
    mentah[kode] = {
      dipilih: formData.get(`${kode}_dipilih`),
      catatan: formData.get(`${kode}_catatan`),
    };
  }

  const parsed = bagianBSchema.safeParse(mentah);

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}/bagian-b?error=${encodeURIComponent(pesan)}`,
    );
  }

  const dataBaru = {
    ...(submission.data as Record<string, unknown>),
    bagianB: parsed.data,
  };

  const { error: updateError } = await supabase
    .from("submissions")
    .update({ data: dataBaru })
    .eq("id", submissionId);

  if (updateError) {
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}/bagian-b?error=${encodeURIComponent(
        updateError.message,
      )}`,
    );
  }

  redirect(`/forms/${FORM_SLUG}/${submissionId}/bagian-c`);
}

export async function submitBagianC(formData: FormData) {
  await requireRole("evaluator");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const submissionId = formData.get("submissionId") as string;

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, status, data")
    .eq("id", submissionId)
    .single();

  if (!submission) {
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}/bagian-c?error=${encodeURIComponent(
        "Screening tidak ditemukan.",
      )}`,
    );
  }

  const mentah: Record<string, unknown> = {};
  for (const { kode } of SCORING_CRITERIA) {
    mentah[kode] = {
      skor: formData.get(`${kode}_skor`),
      catatan: formData.get(`${kode}_catatan`),
    };
  }

  const parsed = bagianCSchema.safeParse(mentah);

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}/bagian-c?error=${encodeURIComponent(pesan)}`,
    );
  }

  const skorPerKriteria = Object.fromEntries(
    SCORING_CRITERIA.map(({ kode }) => [kode, parsed.data[kode].skor]),
  );
  const totalSkor = hitungTotalSkor(skorPerKriteria);

  const dataBaru = {
    ...(submission.data as Record<string, unknown>),
    bagianC: parsed.data,
  };

  const { error: updateError } = await supabase
    .from("submissions")
    .update({ data: dataBaru, total_skor: totalSkor })
    .eq("id", submissionId);

  if (updateError) {
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}/bagian-c?error=${encodeURIComponent(
        updateError.message,
      )}`,
    );
  }

  await supabase.from("submission_history").insert({
    submission_id: submissionId,
    status_lama: submission.status,
    status_baru: submission.status,
    diubah_oleh: user.id,
    catatan: `Penilaian Bagian C tersimpan, total skor ${totalSkor}.`,
  });

  redirect(`/forms/${FORM_SLUG}/${submissionId}/bagian-d`);
}

export async function submitBagianD(formData: FormData) {
  await requireRole("evaluator");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const submissionId = formData.get("submissionId") as string;

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, status, data, total_skor")
    .eq("id", submissionId)
    .single();

  if (!submission) {
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}/bagian-d?error=${encodeURIComponent(
        "Screening tidak ditemukan.",
      )}`,
    );
  }

  if (submission.status !== "draft" || submission.total_skor == null) {
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}/bagian-d?error=${encodeURIComponent(
        "Screening ini belum siap diajukan (penilaian Bagian C belum lengkap).",
      )}`,
    );
  }

  const parsed = bagianDSchema.safeParse({
    faktorPendorong: formData.get("faktorPendorong"),
    faktorRisiko: formData.get("faktorRisiko"),
    dataDibutuhkanOft: formData.get("dataDibutuhkanOft"),
    urgensiTenggat: formData.get("urgensiTenggat"),
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}/bagian-d?error=${encodeURIComponent(pesan)}`,
    );
  }

  const dataBaru = {
    ...(submission.data as Record<string, unknown>),
    bagianD: {
      ...parsed.data,
      namaAnalis: user.user_metadata?.full_name ?? user.email,
      difinalisasiPada: new Date().toISOString(),
    },
  };

  const { error: updateError } = await supabase
    .from("submissions")
    .update({
      data: dataBaru,
      status: "menunggu_manajer",
      tingkat_approval_saat_ini: "manajer",
    })
    .eq("id", submissionId);

  if (updateError) {
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}/bagian-d?error=${encodeURIComponent(
        updateError.message,
      )}`,
    );
  }

  await supabase.from("submission_history").insert({
    submission_id: submissionId,
    status_lama: submission.status,
    status_baru: "menunggu_manajer",
    diubah_oleh: user.id,
    catatan: `Bagian D lengkap (total skor ${submission.total_skor}). Diajukan untuk approval Manajer.`,
  });

  redirect(`/forms/${FORM_SLUG}/${submissionId}`);
}

export async function putuskanApprovalQuickScreen(formData: FormData) {
  const submissionId = formData.get("submissionId") as string;
  const tingkat = formData.get("tingkat") as "manajer" | "vp";
  const keputusan = formData.get("keputusan") as "disetujui" | "ditolak";
  const catatan = (formData.get("catatan") as string | null)?.trim();

  await requireRole(tingkat);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  if (!catatan) {
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}?error=${encodeURIComponent("Catatan wajib diisi.")}`,
    );
  }

  const statusMenunggu = `menunggu_${tingkat}`;

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("id", submissionId)
    .eq("status", statusMenunggu)
    .single();

  if (!submission) {
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}?error=${encodeURIComponent(
        "Screening tidak dalam status yang bisa Anda putuskan.",
      )}`,
    );
  }

  const { data: chainRow, error: chainError } = await supabase
    .from("approval_chain")
    .update({
      status: keputusan,
      approver_user_id: user.id,
      catatan,
      diputuskan_pada: new Date().toISOString(),
    })
    .eq("submission_id", submissionId)
    .eq("tingkat", tingkat)
    .eq("status", "menunggu")
    .select("id")
    .single();

  if (chainError || !chainRow) {
    return redirect(
      `/forms/${FORM_SLUG}/${submissionId}?error=${encodeURIComponent(
        chainError?.message ?? "Keputusan ini sudah pernah diambil sebelumnya.",
      )}`,
    );
  }

  // Manajer setuju -> lanjut ke VP. Manajer/VP tolak -> ditolak final (tanpa opsi
  // hentikan/teruskan). VP setuju -> disetujui final. VP adalah tingkat terakhir.
  let statusBaru: string;
  let tingkatBaru: string;

  if (tingkat === "manajer") {
    statusBaru = keputusan === "disetujui" ? "menunggu_vp" : "ditolak";
    tingkatBaru = keputusan === "disetujui" ? "vp" : "selesai";
  } else {
    statusBaru = keputusan === "disetujui" ? "disetujui" : "ditolak";
    tingkatBaru = "selesai";
  }

  await supabase
    .from("submissions")
    .update({ status: statusBaru, tingkat_approval_saat_ini: tingkatBaru })
    .eq("id", submissionId);

  await supabase.from("submission_history").insert({
    submission_id: submissionId,
    status_lama: submission.status,
    status_baru: statusBaru,
    diubah_oleh: user.id,
    catatan: `Tingkat ${tingkat}: ${keputusan}. ${catatan}`,
  });

  redirect(`/forms/${FORM_SLUG}/${submissionId}`);
}
