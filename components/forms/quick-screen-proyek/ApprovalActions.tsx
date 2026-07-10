import { putuskanApprovalQuickScreen } from "@/actions/quick-screen-proyek";
import { LABEL_TINGKAT } from "@/lib/forms/quick-screen-proyek/labels";
import type { AppRole } from "@/lib/supabase/role";

type Tingkat = "manajer" | "vp";

type ApprovalRow = {
  tingkat: Tingkat;
  status: "menunggu" | "disetujui" | "ditolak";
} | null;

export function ApprovalActions({
  submissionId,
  submissionStatus,
  role,
  approvalChain,
}: {
  submissionId: string;
  submissionStatus: string;
  role: AppRole | null;
  approvalChain: ApprovalRow[];
}) {
  const [manajer, vp] = approvalChain;

  if (
    role === "manajer" &&
    submissionStatus === "menunggu_manajer" &&
    manajer?.status === "menunggu"
  ) {
    return <FormKeputusan submissionId={submissionId} tingkat="manajer" />;
  }
  if (role === "vp" && submissionStatus === "menunggu_vp" && vp?.status === "menunggu") {
    return <FormKeputusan submissionId={submissionId} tingkat="vp" isFinal />;
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
      action={putuskanApprovalQuickScreen}
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
