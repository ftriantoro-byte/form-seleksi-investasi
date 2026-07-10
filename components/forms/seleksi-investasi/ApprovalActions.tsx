import { putuskanApproval, putuskanLanjutan } from "@/actions/approval";
import { LABEL_TINGKAT } from "@/lib/forms/seleksi-investasi/labels";
import type { AppRole } from "@/lib/supabase/role";

type Tingkat = "manajer" | "vp" | "direksi";

type ApprovalRow = {
  tingkat: Tingkat;
  status: "menunggu" | "disetujui" | "ditolak";
} | null;

export function ApprovalActions({
  submissionId,
  submissionStatus,
  isOwner,
  role,
  approvalChain,
}: {
  submissionId: string;
  submissionStatus: string;
  isOwner: boolean;
  role: AppRole | null;
  approvalChain: ApprovalRow[];
}) {
  const [manajer, vp, direksi] = approvalChain;

  if (isOwner) {
    if (submissionStatus === "menunggu_manajer" && manajer?.status === "ditolak") {
      return <PilihanLanjutan submissionId={submissionId} tingkat="manajer" />;
    }
    if (submissionStatus === "menunggu_vp" && vp?.status === "ditolak") {
      return <PilihanLanjutan submissionId={submissionId} tingkat="vp" />;
    }
  }

  if (
    role === "manajer" &&
    submissionStatus === "menunggu_manajer" &&
    manajer?.status === "menunggu"
  ) {
    return <FormKeputusan submissionId={submissionId} tingkat="manajer" />;
  }
  if (role === "vp" && submissionStatus === "menunggu_vp" && vp?.status === "menunggu") {
    return <FormKeputusan submissionId={submissionId} tingkat="vp" />;
  }
  if (
    role === "direksi" &&
    submissionStatus === "menunggu_direksi" &&
    direksi?.status === "menunggu"
  ) {
    return <FormKeputusan submissionId={submissionId} tingkat="direksi" isFinal />;
  }

  return null;
}

function FormKeputusan({
  submissionId,
  tingkat,
  isFinal,
}: {
  submissionId: string;
  tingkat: Tingkat;
  isFinal?: boolean;
}) {
  return (
    <form
      action={putuskanApproval}
      className="flex flex-col gap-4 rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-7"
    >
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="tingkat" value={tingkat} />
      <p className="text-[14px] font-medium text-zinc-700">
        Keputusan Anda ({LABEL_TINGKAT[tingkat]})
        {isFinal && (
          <span className="ml-2 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500">
            final &middot; tanpa eskalasi
          </span>
        )}
      </p>
      <textarea
        name="catatan"
        required
        placeholder="Catatan (wajib)"
        rows={3}
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 shadow-sm outline-none transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
      />
      <div className="flex gap-3">
        <button
          type="submit"
          name="keputusan"
          value="disetujui"
          className="rounded-full bg-emerald-600 px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-emerald-700 active:scale-[0.98]"
        >
          Setuju
        </button>
        <button
          type="submit"
          name="keputusan"
          value="ditolak"
          className="rounded-full bg-red-600 px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-red-700 active:scale-[0.98]"
        >
          Tolak
        </button>
      </div>
    </form>
  );
}

function PilihanLanjutan({
  submissionId,
  tingkat,
}: {
  submissionId: string;
  tingkat: "manajer" | "vp";
}) {
  return (
    <form
      action={putuskanLanjutan}
      className="flex flex-col gap-4 rounded-3xl border border-amber-100 bg-amber-50/60 p-6 sm:p-7"
    >
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="tingkat" value={tingkat} />
      <p className="text-[14px] font-medium text-amber-800">
        Proposal ditolak di tingkat {LABEL_TINGKAT[tingkat]}. Pilih tindak lanjut:
      </p>
      <div className="flex gap-3">
        <button
          type="submit"
          name="pilihan"
          value="hentikan"
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
        >
          Hentikan proses
        </button>
        <button
          type="submit"
          name="pilihan"
          value="teruskan"
          className="rounded-full border border-amber-300 bg-white px-5 py-2.5 text-[14px] font-medium text-amber-700 shadow-sm transition-all duration-150 hover:bg-amber-50 active:scale-[0.98]"
        >
          Tetap teruskan
        </button>
      </div>
    </form>
  );
}
