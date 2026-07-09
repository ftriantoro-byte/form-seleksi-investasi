import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/supabase/role";
import { STATUS_LABEL } from "@/lib/forms/seleksi-investasi/labels";

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
      namaProyek?: string;
      tanggalDiterima?: string;
      evaluatorPic?: string;
    };
  };
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
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-sm text-gray-600">Role Anda belum diatur, hubungi admin.</p>
      </main>
    );
  }

  let query = supabase
    .from("submissions")
    .select(
      "id, status, tingkat_approval_saat_ini, total_skor, dibuat_oleh, dibuat_pada, data",
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
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Dashboard Submission</h1>

      {isApproverRole && (
        <div className="mt-4 flex gap-2 text-sm">
          <Link
            href="/dashboard"
            className={`rounded-md px-3 py-1.5 ${tab !== "riwayat" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Menunggu Keputusan Saya
          </Link>
          <Link
            href="/dashboard?tab=riwayat"
            className={`rounded-md px-3 py-1.5 ${tab === "riwayat" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Riwayat
          </Link>
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2 pr-4">No. Registrasi</th>
              <th className="py-2 pr-4">Nama Proyek</th>
              <th className="py-2 pr-4">Tanggal Diterima</th>
              <th className="py-2 pr-4">Evaluator</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Tingkat Saat Ini</th>
              <th className="py-2 pr-4">Total Skor</th>
              <th className="py-2 pr-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(submissions ?? []).map((s) => (
              <tr key={s.id} className="border-b border-gray-100">
                <td className="py-2 pr-4">{s.data.bagianA?.nomorRegistrasi ?? "-"}</td>
                <td className="py-2 pr-4">{s.data.bagianA?.namaProyek ?? "-"}</td>
                <td className="py-2 pr-4">{s.data.bagianA?.tanggalDiterima ?? "-"}</td>
                <td className="py-2 pr-4">{s.data.bagianA?.evaluatorPic ?? "-"}</td>
                <td className="py-2 pr-4">
                  {STATUS_LABEL[s.status] ?? s.status}
                  {perluTindakanIds.has(s.id) && (
                    <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      perlu keputusan Anda
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4">{s.tingkat_approval_saat_ini ?? "-"}</td>
                <td className="py-2 pr-4">
                  {s.total_skor != null ? Number(s.total_skor).toFixed(2) : "-"}
                </td>
                <td className="py-2 pr-4">
                  <Link
                    href={`/forms/seleksi-investasi/${s.id}`}
                    className="text-gray-900 underline"
                  >
                    Lihat
                  </Link>
                </td>
              </tr>
            ))}
            {(!submissions || submissions.length === 0) && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-400">
                  Tidak ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
