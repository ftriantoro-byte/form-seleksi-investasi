"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/role";

type Tingkat = "manajer" | "vp" | "direksi";

const TINGKAT_BERIKUTNYA: Record<"manajer" | "vp", "vp" | "direksi"> = {
  manajer: "vp",
  vp: "direksi",
};

export async function putuskanApproval(formData: FormData) {
  const submissionId = formData.get("submissionId") as string;
  const tingkat = formData.get("tingkat") as Tingkat;
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
      `/forms/seleksi-investasi/${submissionId}?error=${encodeURIComponent(
        "Catatan wajib diisi.",
      )}`,
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
      `/forms/seleksi-investasi/${submissionId}?error=${encodeURIComponent(
        "Proposal tidak dalam status yang bisa Anda putuskan.",
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
      `/forms/seleksi-investasi/${submissionId}?error=${encodeURIComponent(
        chainError?.message ?? "Keputusan ini sudah pernah diambil sebelumnya.",
      )}`,
    );
  }

  let statusBaru = submission.status;
  let tingkatBaru: string | null = tingkat;

  if (tingkat === "direksi") {
    // Direksi adalah tingkat final - tidak ada opsi teruskan setelah ini.
    statusBaru = keputusan === "disetujui" ? "disetujui" : "ditolak";
    tingkatBaru = "selesai";
  } else if (keputusan === "disetujui") {
    const berikutnya = TINGKAT_BERIKUTNYA[tingkat];
    statusBaru = `menunggu_${berikutnya}`;
    tingkatBaru = berikutnya;
  }
  // Jika ditolak di tingkat manajer/vp, status TIDAK berubah - menunggu
  // keputusan evaluator (hentikan/teruskan) lewat putuskanLanjutan().

  if (statusBaru !== submission.status) {
    await supabase
      .from("submissions")
      .update({ status: statusBaru, tingkat_approval_saat_ini: tingkatBaru })
      .eq("id", submissionId);
  }

  await supabase.from("submission_history").insert({
    submission_id: submissionId,
    status_lama: submission.status,
    status_baru: statusBaru,
    diubah_oleh: user.id,
    catatan: `Tingkat ${tingkat}: ${keputusan}. ${catatan}`,
  });

  redirect(`/forms/seleksi-investasi/${submissionId}`);
}

export async function putuskanLanjutan(formData: FormData) {
  await requireRole("evaluator");

  const submissionId = formData.get("submissionId") as string;
  const tingkat = formData.get("tingkat") as "manajer" | "vp";
  const pilihan = formData.get("pilihan") as "hentikan" | "teruskan";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("id", submissionId)
    .eq("dibuat_oleh", user.id)
    .eq("status", `menunggu_${tingkat}`)
    .single();

  if (!submission) {
    return redirect(
      `/forms/seleksi-investasi/${submissionId}?error=${encodeURIComponent(
        "Proposal tidak ditemukan atau tidak dalam status yang sesuai.",
      )}`,
    );
  }

  let statusBaru: string;
  let tingkatBaru: string | null;

  if (pilihan === "hentikan") {
    statusBaru = "ditolak";
    tingkatBaru = "selesai";
  } else {
    const berikutnya = TINGKAT_BERIKUTNYA[tingkat];
    statusBaru = `menunggu_${berikutnya}`;
    tingkatBaru = berikutnya;

    await supabase
      .from("approval_chain")
      .update({ diteruskan_meski_ditolak: true })
      .eq("submission_id", submissionId)
      .eq("tingkat", tingkat);
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
    catatan:
      pilihan === "hentikan"
        ? `Evaluator memilih menghentikan proses setelah ditolak di tingkat ${tingkat}.`
        : `Evaluator memilih tetap meneruskan proses meski ditolak di tingkat ${tingkat}.`,
  });

  redirect(`/forms/seleksi-investasi/${submissionId}`);
}
