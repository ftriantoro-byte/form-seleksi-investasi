import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/supabase/role";
import { getHasilQuickScreen, hitungSkorDimensi } from "@/lib/forms/quick-screen-proyek/utils";
import {
  SKEMA_KERJASAMA_OPTIONS,
  SCORING_CRITERIA,
  DIMENSI_LIST,
  type SkemaKode,
  type ScoringKode,
} from "@/lib/forms/quick-screen-proyek/schema";
import {
  STATUS_LABEL,
  STATUS_BADGE_KELAS,
  LABEL_TINGKAT,
  LABEL_STATUS_APPROVAL,
  LABEL_DIMENSI,
} from "@/lib/forms/quick-screen-proyek/labels";
import { ApprovalActions } from "@/components/forms/quick-screen-proyek/ApprovalActions";
import { RadarSkorChart } from "@/components/forms/quick-screen-proyek/RadarSkorChart";
import { FormPageShell } from "@/components/ui/FormPageShell";

type SubmissionData = {
  bagianA?: {
    noDokumen: string;
    tanggal: string;
    statusDokumen: string;
    namaProyek: string;
    sektorTipologiProyek: string;
    pemilikPemberiInformasi: string;
    lokasiProyek: string;
    tanggalInfoDiterima: string;
    estimasiNilaiProyek: number;
    sumberInformasi: string;
    deskripsiProyek: string;
  };
  bagianB?: Record<SkemaKode, { dipilih: "ya" | "tidak"; catatan?: string }>;
  bagianC?: Record<ScoringKode, { skor: number; catatan?: string }>;
  bagianD?: {
    faktorPendorong: string;
    faktorRisiko: string;
    dataDibutuhkanOft: string;
    urgensiTenggat: string;
    namaAnalis: string;
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
  tingkat: "manajer" | "vp";
  status: "menunggu" | "disetujui" | "ditolak";
  approver_user_id: string | null;
  catatan: string | null;
  diputuskan_pada: string | null;
};

const URUTAN_TINGKAT = ["manajer", "vp"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-7">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

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
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Screening tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  const { data: approvalChainRaw } = await supabase
    .from("approval_chain")
    .select("tingkat, status, approver_user_id, catatan, diputuskan_pada")
    .eq("submission_id", submissionId)
    .in("tingkat", URUTAN_TINGKAT)
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
  const hasil = submission.total_skor != null ? getHasilQuickScreen(submission.total_skor) : null;
  const perDimensi = bagianC ? hitungSkorDimensi(
    Object.fromEntries(SCORING_CRITERIA.map(({ kode }) => [kode, bagianC[kode]?.skor])),
  ) : null;
  const statusKelas = STATUS_BADGE_KELAS[submission.status] ?? "bg-zinc-100 text-zinc-500";

  return (
    <FormPageShell maxWidth="max-w-3xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-zinc-900">
            {bagianA?.namaProyek ?? "Screening"}
          </h1>
          <p className="mt-1 text-[14px] text-zinc-400">{bagianA?.noDokumen ?? submission.id}</p>
          <div
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${statusKelas}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
            {STATUS_LABEL[submission.status] ?? submission.status}
          </div>
        </div>

        <a
          href={`/forms/quick-screen-proyek/${submission.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-600 shadow-sm transition-colors duration-150 hover:border-zinc-300 hover:bg-zinc-50"
        >
          Download PDF
        </a>
      </div>

      {error && (
        <p className="mb-6 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">{error}</p>
      )}

      <div className="flex flex-col gap-5">
        {bagianA && (
          <Section title="Bagian A — Identitas Proyek">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2">
              {(
                [
                  ["Tanggal", bagianA.tanggal],
                  ["Status dokumen", bagianA.statusDokumen],
                  ["Sektor/tipologi proyek", bagianA.sektorTipologiProyek],
                  ["Pemilik/pemberi informasi", bagianA.pemilikPemberiInformasi],
                  ["Lokasi proyek", bagianA.lokasiProyek],
                  ["Tanggal info diterima", bagianA.tanggalInfoDiterima],
                  [
                    "Estimasi nilai proyek",
                    `Rp ${Number(bagianA.estimasiNilaiProyek).toLocaleString("id-ID")}`,
                  ],
                  ["Sumber informasi", bagianA.sumberInformasi],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-zinc-400">{label}</dt>
                  <dd className="mt-0.5 font-medium text-zinc-800">{value}</dd>
                </div>
              ))}
              <div className="sm:col-span-2">
                <dt className="text-zinc-400">Deskripsi proyek</dt>
                <dd className="mt-0.5 font-medium text-zinc-800">{bagianA.deskripsiProyek}</dd>
              </div>
            </dl>
          </Section>
        )}

        {bagianB && (
          <Section title="Bagian B — Skema Kerjasama">
            <ul className="flex flex-col gap-2">
              {SKEMA_KERJASAMA_OPTIONS.map(({ kode, label }) => {
                const dipilih = bagianB[kode]?.dipilih === "ya";
                return (
                  <li key={kode} className="flex items-start gap-3 text-[14px]">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        dipilih ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      {dipilih ? "✓" : "–"}
                    </span>
                    <span className="text-zinc-600">
                      {label}
                      {bagianB[kode]?.catatan && (
                        <span className="ml-1.5 text-zinc-400">— {bagianB[kode]?.catatan}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {bagianC && perDimensi && (
          <Section title="Bagian C — Penilaian 4 Dimensi">
            <RadarSkorChart
              data={DIMENSI_LIST.map((d) => ({ dimensi: LABEL_DIMENSI[d], skor: perDimensi[d] }))}
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[13px]">
                <thead>
                  <tr className="text-zinc-400">
                    <th className="pb-2 font-medium">Dimensi</th>
                    <th className="pb-2 pl-2 font-medium">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {DIMENSI_LIST.map((d) => (
                    <tr key={d} className="border-t border-zinc-100">
                      <td className="py-2 pr-2 text-zinc-700">{LABEL_DIMENSI[d]}</td>
                      <td className="py-2 pl-2 font-medium text-zinc-800">
                        {perDimensi[d]} / 15
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {submission.total_skor != null && (
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
                <span className="text-[13px] font-medium text-zinc-500">Total skor</span>
                <span className="text-[17px] font-semibold text-zinc-900">
                  {submission.total_skor}{" "}
                  <span className="text-[12px] font-normal text-zinc-400">/ 60</span>
                </span>
              </div>
            )}
          </Section>
        )}

        {hasil && (
          <div
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold ${hasil.kelas}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
            {hasil.label}
          </div>
        )}

        {bagianD && (
          <Section title="Bagian D — Catatan Analis">
            <dl className="flex flex-col gap-3 text-[14px]">
              <div>
                <dt className="text-zinc-400">Faktor pendorong (strength)</dt>
                <dd className="mt-0.5 text-zinc-700">{bagianD.faktorPendorong}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Faktor risiko (red flag)</dt>
                <dd className="mt-0.5 text-zinc-700">{bagianD.faktorRisiko}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Data/dokumen dibutuhkan untuk OFT</dt>
                <dd className="mt-0.5 text-zinc-700">{bagianD.dataDibutuhkanOft}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Urgensi &amp; tenggat</dt>
                <dd className="mt-0.5 text-zinc-700">{bagianD.urgensiTenggat}</dd>
              </div>
            </dl>
          </Section>
        )}

        {approvalChainRaw && approvalChainRaw.length > 0 && (
          <Section title="Alur Approval">
            <div className="flex flex-col">
              {approvalChain.map((baris, i) => {
                const tingkat = URUTAN_TINGKAT[i];
                const isLast = i === approvalChain.length - 1;
                const nama = baris?.approver_user_id
                  ? (namaApprover.get(baris.approver_user_id) ?? "-")
                  : null;
                const dotKelas = !baris
                  ? "bg-zinc-100 text-zinc-300"
                  : baris.status === "disetujui"
                    ? "bg-emerald-100 text-emerald-600"
                    : baris.status === "ditolak"
                      ? "bg-red-100 text-red-600"
                      : "bg-amber-100 text-amber-600";
                const dotIsi = !baris
                  ? "–"
                  : baris.status === "disetujui"
                    ? "✓"
                    : baris.status === "ditolak"
                      ? "✕"
                      : "…";

                return (
                  <div key={tingkat} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${dotKelas}`}
                      >
                        {dotIsi}
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-zinc-100" />}
                    </div>
                    <div className={isLast ? "pb-0" : "pb-6"}>
                      <p className="pt-0.5 text-[14px] font-medium text-zinc-800">
                        {LABEL_TINGKAT[tingkat]}
                        {baris && (
                          <span className="font-normal text-zinc-400">
                            {" "}
                            &middot; {LABEL_STATUS_APPROVAL[baris.status]}
                            {nama && ` oleh ${nama}`}
                          </span>
                        )}
                      </p>
                      {!baris && (
                        <p className="mt-0.5 text-[13px] text-zinc-400">Belum dimulai</p>
                      )}
                      {baris?.catatan && (
                        <p className="mt-1 text-[13px] text-zinc-500">{baris.catatan}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        <ApprovalActions
          submissionId={submission.id}
          submissionStatus={submission.status}
          role={role}
          approvalChain={approvalChain}
        />
      </div>
    </FormPageShell>
  );
}
