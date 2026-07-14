"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireExsumEditor } from "@/lib/exsum/access";
import { exsumReportMetaSchema } from "@/lib/exsum/schema";
import { EXSUM_BLANK_DATA, type ExsumData } from "@/lib/exsum/types";

const EXSUM_LIST_PATH = "/exsum";

function reportPath(reportId: string) {
  return `/exsum/${reportId}`;
}

function editPath(reportId: string) {
  return `/exsum/${reportId}/edit`;
}

// Buat/ubah/hapus laporan dibatasi whitelist exsum_editors - laporan ini
// untuk Direksi/Dewan Komisaris, semua pegawai login boleh BACA (lihat RLS
// di migrasi) tapi data-entry-nya dibatasi supaya angkanya bisa
// dipertanggungjawabkan. SENGAJA bukan app_role admin (admin dipakai luas
// utk approval form seleksi investasi - editor Exsum tidak otomatis dapat
// akses admin ke seluruh sistem approval).
export async function createReport(formData: FormData) {
  await requireExsumEditor();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const parsed = exsumReportMetaSchema.safeParse({
    perusahaan: formData.get("perusahaan"),
    kode: formData.get("kode"),
    periode: formData.get("periode"),
    noDok: formData.get("noDok"),
    status: formData.get("status") || "Draft",
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${EXSUM_LIST_PATH}?error=${encodeURIComponent(pesan)}`);
  }

  const { data: report, error } = await supabase
    .from("exsum_reports")
    .insert({
      perusahaan: parsed.data.perusahaan,
      kode: parsed.data.kode,
      periode: parsed.data.periode,
      no_dok: parsed.data.noDok,
      status: parsed.data.status,
      data: { ...EXSUM_BLANK_DATA, subjudul: "" },
      dibuat_oleh: user.id,
    })
    .select("id")
    .single();

  if (error || !report) {
    return redirect(
      `${EXSUM_LIST_PATH}?error=${encodeURIComponent(error?.message ?? "Gagal membuat laporan.")}`,
    );
  }

  revalidatePath(EXSUM_LIST_PATH);
  redirect(editPath(report.id));
}

// Duplikat laporan bulan lalu sbg titik awal bulan berjalan (susulan dari
// keputusan "riwayat per bulan") - meta (periode/noDok/status) diisi ulang
// oleh user via form, isi datanya (7 section) disalin persis dari sumber.
export async function duplicateReport(formData: FormData) {
  await requireExsumEditor();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const sourceId = formData.get("sourceId") as string;

  const parsed = exsumReportMetaSchema.safeParse({
    perusahaan: formData.get("perusahaan"),
    kode: formData.get("kode"),
    periode: formData.get("periode"),
    noDok: formData.get("noDok"),
    status: formData.get("status") || "Draft",
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${EXSUM_LIST_PATH}?error=${encodeURIComponent(pesan)}`);
  }

  const { data: source } = await supabase
    .from("exsum_reports")
    .select("data")
    .eq("id", sourceId)
    .single();

  const { data: report, error } = await supabase
    .from("exsum_reports")
    .insert({
      perusahaan: parsed.data.perusahaan,
      kode: parsed.data.kode,
      periode: parsed.data.periode,
      no_dok: parsed.data.noDok,
      status: parsed.data.status,
      data: source?.data ?? EXSUM_BLANK_DATA,
      dibuat_oleh: user.id,
    })
    .select("id")
    .single();

  if (error || !report) {
    return redirect(
      `${EXSUM_LIST_PATH}?error=${encodeURIComponent(error?.message ?? "Gagal menduplikasi laporan.")}`,
    );
  }

  revalidatePath(EXSUM_LIST_PATH);
  redirect(editPath(report.id));
}

export async function deleteReport(formData: FormData) {
  await requireExsumEditor();

  const supabase = await createClient();
  const reportId = formData.get("reportId") as string;

  const { error } = await supabase.from("exsum_reports").delete().eq("id", reportId);

  if (error) {
    return redirect(`${EXSUM_LIST_PATH}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(EXSUM_LIST_PATH);
  redirect(EXSUM_LIST_PATH);
}

// Dipanggil langsung (bukan lewat <form>) dari ExsumEditForm (Client
// Component) - form-nya kelola 1 objek besar (7 section, array bersarang)
// di state React, jauh lebih praktis dikirim sbg 1 argumen JSON daripada
// dipecah jadi ratusan field FormData bernama dinamis. Meta & data digabung
// jadi 1 pemanggilan (bukan 2 aksi terpisah) supaya tombol "Simpan" di form
// cuma perlu 1 request & 1 status sukses/gagal.
export async function updateReport(
  reportId: string,
  payload: {
    perusahaan: string;
    kode: string;
    periode: string;
    noDok: string;
    status: "Draft" | "Final";
    data: ExsumData;
  },
) {
  await requireExsumEditor();

  const parsed = exsumReportMetaSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("exsum_reports")
    .update({
      perusahaan: parsed.data.perusahaan,
      kode: parsed.data.kode,
      periode: parsed.data.periode,
      no_dok: parsed.data.noDok,
      status: parsed.data.status,
      data: payload.data,
    })
    .eq("id", reportId);

  if (error) throw new Error(error.message);
  revalidatePath(EXSUM_LIST_PATH);
  revalidatePath(reportPath(reportId));
}
