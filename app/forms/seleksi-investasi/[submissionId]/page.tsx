import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/supabase/role";
import { getRekomendasi } from "@/lib/forms/seleksi-investasi/utils";
import {
  GATE_CRITERIA,
  SCORING_CRITERIA,
  type GateKode,
  type ScoringKode,
} from "@/lib/forms/seleksi-investasi/schema";
import {
  STATUS_LABEL,
  LABEL_TINGKAT,
  LABEL_STATUS_APPROVAL,
} from "@/lib/forms/seleksi-investasi/labels";
import { ApprovalActions } from "@/components/forms/seleksi-investasi/ApprovalActions";

type SubmissionData = {
  bagianA?: {
    nomorRegistrasi: string;
    tanggalDiterima: string;
    namaProyek: string;
    lokasiProyek: string;
    namaPengusul: string;
    sumberProposal: string;
    skemaKerjasama: string;
    estimasiNilaiInvestasi: number;
    evaluatorPic: string;
    targetSelesai: string;
  };
  bagianB?: Record<GateKode, { jawaban: "ya" | "tidak"; catatan: string }>;
  bagianC?: Record<ScoringKode, { skor: number; justifikasi: string }>;
  bagianD?: {
    catatanEvaluator: string;
    pernyataanBebasBenturan: "ya" | "tidak";
    rekomendasi: string;
    namaEvaluator: string;
  };
};

type SubmissionRow = {
  id: string;
  status: string;
  tingkat_approval_saat_ini: string | null;
  total_skor: number | null;
  dibuat_oleh: string;
  dibuat_pada: string;
  data: SubmissionData;
};

type ApprovalRow = {
  tingkat: "manajer" | "vp" | "direksi";
  status: "menunggu" | "disetujui" | "ditolak";
  approver_user_id: string | null;
  catatan: string | null;
  diteruskan_meski_ditolak: boolean;
  diputuskan_pada: string | null;
};

const URUTAN_TINGKAT = ["manajer", "vp", "direksi"] as const;

export default async function SubmissionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ submissionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { submissionId } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getCurrentUserRole();

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, status, tingkat_approval_saat_ini, total_skor, dibuat_oleh, dibuat_pada, data")
    .eq("id", submissionId)
    .single<SubmissionRow>();

  if (!submission) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-sm text-gray-600">
          Proposal tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </main>
    );
  }

  const { data: approvalChainRaw } = await supabase
    .from("approval_chain")
    .select(
      "tingkat, status, approver_user_id, catatan, diteruskan_meski_ditolak, diputuskan_pada",
    )
    .eq("submission_id", submissionId)
    .returns<ApprovalRow[]>();

  const approverIds = (approvalChainRaw ?? [])
    .map((a) => a.approver_user_id)
    .filter((id): id is string => id != null);

  const namaApprover = new Map<string, string>();
  if (approverIds.length > 0) {
    const { data: approverRows } = await supabase
      .from("user_roles")
      .select("user_id, full_name")
      .in("user_id", approverIds);
    for (const row of approverRows ?? []) {
      namaApprover.set(row.user_id, row.full_name);
    }
  }

  const approvalChain = URUTAN_TINGKAT.map(
    (tingkat) => approvalChainRaw?.find((a) => a.tingkat === tingkat) ?? null,
  );

  const { bagianA, bagianB, bagianC, bagianD } = submission.data;
  const rekomendasi = submission.total_skor != null ? getRekomendasi(submission.total_skor) : null;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">
        {bagianA?.namaProyek ?? "Proposal"}{" "}
        <span className="text-base font-normal text-gray-500">
          ({bagianA?.nomorRegistrasi ?? submission.id})
        </span>
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Status: {STATUS_LABEL[submission.status] ?? submission.status}
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {bagianA && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">Bagian A &mdash; Identitas Proposal</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Tanggal diterima</dt>
            <dd>{bagianA.tanggalDiterima}</dd>
            <dt className="text-gray-500">Lokasi proyek</dt>
            <dd>{bagianA.lokasiProyek}</dd>
            <dt className="text-gray-500">Nama pengusul</dt>
            <dd>{bagianA.namaPengusul}</dd>
            <dt className="text-gray-500">Sumber proposal</dt>
            <dd>{bagianA.sumberProposal}</dd>
            <dt className="text-gray-500">Skema kerjasama</dt>
            <dd>{bagianA.skemaKerjasama}</dd>
            <dt className="text-gray-500">Estimasi nilai investasi</dt>
            <dd>Rp {Number(bagianA.estimasiNilaiInvestasi).toLocaleString("id-ID")}</dd>
            <dt className="text-gray-500">Evaluator/PIC</dt>
            <dd>{bagianA.evaluatorPic}</dd>
            <dt className="text-gray-500">Target selesai</dt>
            <dd>{bagianA.targetSelesai}</dd>
          </dl>
        </section>
      )}

      {bagianB && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">Bagian B &mdash; Kriteria Gugur (Gate)</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {GATE_CRITERIA.map(({ kode, label }) => (
              <li key={kode}>
                <span
                  className={
                    bagianB[kode].jawaban === "tidak" ? "text-red-700" : "text-green-700"
                  }
                >
                  {bagianB[kode].jawaban === "tidak" ? "Tidak" : "Ya"}
                </span>{" "}
                &mdash; {kode}: {label}
              </li>
            ))}
          </ul>
        </section>
      )}

      {bagianC && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">Bagian C &mdash; Skoring Berbobot</h2>
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="py-1 pr-2">Kriteria</th>
                <th className="pr-2">Bobot</th>
                <th className="pr-2">Skor</th>
                <th className="pr-2">Nilai tertimbang</th>
              </tr>
            </thead>
            <tbody>
              {SCORING_CRITERIA.map(({ kode, label, bobot }) => (
                <tr key={kode}>
                  <td className="py-1 pr-2">
                    {kode}: {label}
                  </td>
                  <td className="pr-2">{bobot.toFixed(2)}</td>
                  <td className="pr-2">{bagianC[kode].skor}</td>
                  <td className="pr-2">{(bobot * bagianC[kode].skor).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {submission.total_skor != null && (
            <p className="mt-2 text-sm font-semibold">
              Total skor tertimbang: {Number(submission.total_skor).toFixed(2)} / 5.00
            </p>
          )}
        </section>
      )}

      {rekomendasi && (
        <div
          className={`mt-6 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${rekomendasi.kelas}`}
        >
          {rekomendasi.label}
        </div>
      )}

      {bagianD && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">Bagian D &mdash; Catatan &amp; Pernyataan</h2>
          <p className="mt-2 text-sm text-gray-700">{bagianD.catatanEvaluator}</p>
          <p className="mt-2 text-sm">
            Pernyataan bebas benturan kepentingan:{" "}
            <span className="font-medium">
              {bagianD.pernyataanBebasBenturan === "ya" ? "Ya" : "Tidak"}
            </span>{" "}
            &mdash; {bagianD.namaEvaluator}
          </p>
        </section>
      )}

      {approvalChainRaw && approvalChainRaw.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">Alur Approval</h2>
          <ul className="mt-2 flex flex-col gap-3">
            {approvalChain.map((baris, i) => {
              const tingkat = URUTAN_TINGKAT[i];
              if (!baris) {
                return (
                  <li key={tingkat} className="text-sm text-gray-400">
                    {LABEL_TINGKAT[tingkat]}: belum dimulai
                  </li>
                );
              }
              const nama = baris.approver_user_id
                ? (namaApprover.get(baris.approver_user_id) ?? "-")
                : null;
              return (
                <li key={tingkat} className="rounded-lg border border-gray-200 p-3 text-sm">
                  <p className="font-medium">
                    {LABEL_TINGKAT[tingkat]}: {LABEL_STATUS_APPROVAL[baris.status]}
                    {nama && ` — ${nama}`}
                  </p>
                  {baris.catatan && <p className="mt-1 text-gray-600">{baris.catatan}</p>}
                  {baris.diteruskan_meski_ditolak && (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Ditolak di tingkat ini, diteruskan atas permintaan Evaluator
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ApprovalActions
        submissionId={submission.id}
        submissionStatus={submission.status}
        isOwner={user?.id === submission.dibuat_oleh}
        role={role}
        approvalChain={approvalChain}
      />
    </main>
  );
}
