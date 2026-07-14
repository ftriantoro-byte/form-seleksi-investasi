"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireExsumEditor } from "@/lib/exsum/access";
import { exsumReportMetaSchema } from "@/lib/exsum/schema";
import { EXSUM_BLANK_DATA, type ExsumData } from "@/lib/exsum/types";
import { seedFromPrevious } from "@/lib/exsum/carryover";

const EXSUM_LIST_PATH = "/exsum";

function reportPath(reportId: string) {
  return `/exsum/${reportId}`;
}

function editPath(reportId: string) {
  return `/exsum/${reportId}/edit`;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Laporan bulan sebelumnya (kode Perusahaan yang sama, paling baru dibuat) -
// dipakai buat isi otomatis field "periode sebelumnya" (catatan user: rutin
// dibuat 1x/bulan, tidak perlu ketik ulang). `excludeId` mencegah laporan
// yang baru saja diduplikasi jadi "previous"-nya dirinya sendiri kalau ada
// race, walau alur normal tidak akan sampai kesitu.
async function findPreviousReport(
  supabase: SupabaseServerClient,
  kode: string,
  excludeId?: string,
): Promise<{ periode: string; data: ExsumData } | null> {
  let query = supabase
    .from("exsum_reports")
    .select("periode, data")
    .eq("kode", kode)
    .order("dibuat_pada", { ascending: false })
    .limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.maybeSingle();
  return data ? { periode: data.periode, data: data.data as ExsumData } : null;
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

  const previous = await findPreviousReport(supabase, parsed.data.kode);
  const seededData = seedFromPrevious({ ...EXSUM_BLANK_DATA, subjudul: "" }, previous, "blank");

  const { data: report, error } = await supabase
    .from("exsum_reports")
    .insert({
      perusahaan: parsed.data.perusahaan,
      kode: parsed.data.kode,
      periode: parsed.data.periode,
      no_dok: parsed.data.noDok,
      status: parsed.data.status,
      data: seededData,
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
    .select("periode, data")
    .eq("id", sourceId)
    .single();

  // Sumber duplikat ITU SENDIRI yang jadi "bulan sebelumnya" - kini tiap KPI
  // di sumber jadi lalu di laporan baru (lihat lib/exsum/carryover.ts).
  const seededData = source
    ? seedFromPrevious(source.data as ExsumData, { periode: source.periode, data: source.data as ExsumData }, "duplicate")
    : EXSUM_BLANK_DATA;

  const { data: report, error } = await supabase
    .from("exsum_reports")
    .insert({
      perusahaan: parsed.data.perusahaan,
      kode: parsed.data.kode,
      periode: parsed.data.periode,
      no_dok: parsed.data.noDok,
      status: parsed.data.status,
      data: seededData,
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
