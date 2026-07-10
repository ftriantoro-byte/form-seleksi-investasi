import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/supabase/role";
import { STATUS_LABEL, STATUS_BADGE_KELAS } from "@/lib/forms/seleksi-investasi/labels";
import { FormPageShell } from "@/components/ui/FormPageShell";

type SubmissionRingkas = {
  id: string;
  status: string;
  tingkat_approval_saat_ini: string | null;
  total_skor: number | null;
  dibuat_oleh: string;
  dibuat_pada: string;
  data: {
    bagianA?: {
      nomorRegistrasi?: string;
      noDokumen?: string;
      namaProyek?: string;
      tanggalDiterima?: string;
      tanggalInfoDiterima?: string;
      evaluatorPic?: string;
      pemilikPemberiInformasi?: string;
    };
  };
  forms: { slug: string; nama: string } | null;
};

const STATUS_PER_TINGKAT: Record<string, string> = {
  manajer: "menunggu_manajer",
  vp: "menunggu_vp",
  direksi: "menunggu_direksi",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getCurrentUserRole();

  if (!user || !role) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">Role Anda belum diatur, hubungi admin.</p>
      </FormPageShell>
    );
  }

  let query = supabase
    .from("submissions")
    .select(
      "id, status, tingkat_approval_saat_ini, total_skor, dibuat_oleh, dibuat_pada, data, forms(slug, nama)",
    )
    .order("dibuat_pada", { ascending: false });

  const isApproverRole = role === "manajer" || role === "vp" || role === "direksi";
  if (isApproverRole) {
    const statusMenunggu = STATUS_PER_TINGKAT[role];
    query = tab === "riwayat" ? query.neq("status", statusMenunggu) : query.eq("status", statusMenunggu);
  }

  const { data: submissions } = await query.returns<SubmissionRingkas[]>();

  const perluTindakanIds = new Set<string>();
  if (role === "evaluator" && submissions && submissions.length > 0) {
    const idRelevan = submissions
      .filter((s) => s.status === "menunggu_manajer" || s.status === "menunggu_vp")
      .map((s) => s.id);

    if (idRelevan.length > 0) {
      const { data: ditolakRows } = await supabase
        .from("approval_chain")
        .select("submission_id, tingkat, status")
        .in("submission_id", idRelevan)
        .eq("status", "ditolak");

      for (const row of ditolakRows ?? []) {
        const submisi = submissions.find((s) => s.id === row.submission_id);
        if (
          submisi &&
          ((submisi.status === "menunggu_manajer" && row.tingkat === "manajer") ||
            (submisi.status === "menunggu_vp" && row.tingkat === "vp"))
        ) {
          perluTindakanIds.add(row.submission_id);
        }
      }
    }
  }

  return (
    <FormPageShell maxWidth="max-w-5xl">
      <h1 className="text-[26px] font-semibold tracking-tight text-zinc-900">
        Dashboard Submission
      </h1>

      {isApproverRole && (
        <div className="mt-5 inline-flex rounded-full bg-zinc-100 p-1">
          <Link
            href="/dashboard"
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              tab !== "riwayat" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            Menunggu Keputusan Saya
          </Link>
          <Link
            href="/dashboard?tab=riwayat"
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              tab === "riwayat" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            Riwayat
          </Link>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-400">
                <th className="px-6 py-3.5 font-medium">No.</th>
                <th className="px-3 py-3.5 font-medium">Nama Proyek</th>
                <th className="px-3 py-3.5 font-medium">Form</th>
                <th className="px-3 py-3.5 font-medium">Tanggal</th>
                <th className="px-3 py-3.5 font-medium">PIC</th>
                <th className="px-3 py-3.5 font-medium">Status</th>
                <th className="px-3 py-3.5 font-medium">Tingkat</th>
                <th className="px-3 py-3.5 font-medium">Skor</th>
                <th className="px-6 py-3.5 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(submissions ?? []).map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-zinc-50 transition-colors duration-100 last:border-0 hover:bg-zinc-50/60"
                >
                  <td className="px-6 py-3.5 font-medium text-zinc-800">
                    {s.data.bagianA?.nomorRegistrasi ?? s.data.bagianA?.noDokumen ?? "-"}
                  </td>
                  <td className="px-3 py-3.5 text-zinc-600">
                    {s.data.bagianA?.namaProyek ?? "-"}
                  </td>
                  <td className="px-3 py-3.5 text-zinc-500">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                      {s.forms?.nama ?? "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-zinc-500">
                    {s.data.bagianA?.tanggalDiterima ?? s.data.bagianA?.tanggalInfoDiterima ?? "-"}
                  </td>
                  <td className="px-3 py-3.5 text-zinc-500">
                    {s.data.bagianA?.evaluatorPic ?? s.data.bagianA?.pemilikPemberiInformasi ?? "-"}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          STATUS_BADGE_KELAS[s.status] ?? "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                      {perluTindakanIds.has(s.id) && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          perlu keputusan Anda
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-zinc-500">
                    {s.tingkat_approval_saat_ini ?? "-"}
                  </td>
                  <td className="px-3 py-3.5 font-medium text-zinc-700">
                    {s.total_skor != null ? Number(s.total_skor).toFixed(2) : "-"}
                  </td>
                  <td className="px-6 py-3.5">
                    <Link
                      href={`/forms/${s.forms?.slug ?? "seleksi-investasi"}/${s.id}`}
                      className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 transition-colors hover:decoration-zinc-900"
                    >
                      Lihat
                    </Link>
                  </td>
                </tr>
              ))}
              {(!submissions || submissions.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-zinc-400">
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </FormPageShell>
  );
}
