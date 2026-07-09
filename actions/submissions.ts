"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/role";
import {
  bagianASchema,
  bagianBSchema,
  bagianCSchema,
  GATE_CRITERIA,
  SCORING_CRITERIA,
} from "@/lib/forms/seleksi-investasi/schema";
import { hitungTotalSkor } from "@/lib/forms/seleksi-investasi/utils";

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
      `/forms/seleksi-investasi/${submissionId}/bagian-b?error=${encodeURIComponent(
        "Proposal tidak ditemukan.",
      )}`,
    );
  }

  const mentah: Record<string, unknown> = {};
  for (const { kode } of GATE_CRITERIA) {
    mentah[kode] = {
      jawaban: formData.get(`${kode}_jawaban`),
      catatan: formData.get(`${kode}_catatan`),
    };
  }

  const parsed = bagianBSchema.safeParse(mentah);

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(
      `/forms/seleksi-investasi/${submissionId}/bagian-b?error=${encodeURIComponent(pesan)}`,
    );
  }

  const lulusGate = GATE_CRITERIA.every(
    ({ kode }) => parsed.data[kode].jawaban === "ya",
  );
  const statusBaru = lulusGate ? "menunggu_skoring" : "tidak_lulus_gate";

  const dataBaru = {
    ...(submission.data as Record<string, unknown>),
    bagianB: parsed.data,
  };

  const { error: updateError } = await supabase
    .from("submissions")
    .update({ data: dataBaru, status: statusBaru })
    .eq("id", submissionId);

  if (updateError) {
    return redirect(
      `/forms/seleksi-investasi/${submissionId}/bagian-b?error=${encodeURIComponent(
        updateError.message,
      )}`,
    );
  }

  await supabase.from("submission_history").insert({
    submission_id: submissionId,
    status_lama: submission.status,
    status_baru: statusBaru,
    diubah_oleh: user.id,
    catatan: lulusGate
      ? "Lulus seluruh kriteria gugur (gate), lanjut ke skoring."
      : "Tidak lulus kriteria gugur (gate), proses dihentikan.",
  });

  redirect(`/forms/seleksi-investasi/${submissionId}/bagian-b`);
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
      `/forms/seleksi-investasi/${submissionId}/bagian-c?error=${encodeURIComponent(
        "Proposal tidak ditemukan.",
      )}`,
    );
  }

  if (submission.status !== "menunggu_skoring") {
    return redirect(
      `/forms/seleksi-investasi/${submissionId}/bagian-c?error=${encodeURIComponent(
        "Proposal ini tidak sedang dalam status menunggu skoring.",
      )}`,
    );
  }

  const mentah: Record<string, unknown> = {};
  for (const { kode } of SCORING_CRITERIA) {
    mentah[kode] = {
      skor: formData.get(`${kode}_skor`),
      justifikasi: formData.get(`${kode}_justifikasi`),
    };
  }

  const parsed = bagianCSchema.safeParse(mentah);

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(
      `/forms/seleksi-investasi/${submissionId}/bagian-c?error=${encodeURIComponent(pesan)}`,
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
      `/forms/seleksi-investasi/${submissionId}/bagian-c?error=${encodeURIComponent(
        updateError.message,
      )}`,
    );
  }

  await supabase.from("submission_history").insert({
    submission_id: submissionId,
    status_lama: submission.status,
    status_baru: submission.status,
    diubah_oleh: user.id,
    catatan: `Skoring Bagian C tersimpan, total skor tertimbang ${totalSkor.toFixed(2)}.`,
  });

  redirect(`/forms/seleksi-investasi/${submissionId}/bagian-d`);
}
