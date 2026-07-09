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
      className="mt-6 flex flex-col gap-3 rounded-lg border border-gray-200 p-4"
    >
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="tingkat" value={tingkat} />
      <p className="text-sm font-medium text-gray-700">
        Keputusan Anda ({LABEL_TINGKAT[tingkat]})
        {isFinal && " — final, tidak ada eskalasi setelah ini"}
      </p>
      <textarea
        name="catatan"
        required
        placeholder="Catatan (wajib)"
        rows={3}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-3">
        <button
          type="submit"
          name="keputusan"
          value="disetujui"
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          Setuju
        </button>
        <button
          type="submit"
          name="keputusan"
          value="ditolak"
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
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
      className="mt-6 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4"
    >
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="tingkat" value={tingkat} />
      <p className="text-sm font-medium text-amber-800">
        Proposal ditolak di tingkat {LABEL_TINGKAT[tingkat]}. Pilih tindak lanjut:
      </p>
      <div className="flex gap-3">
        <button
          type="submit"
          name="pilihan"
          value="hentikan"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Hentikan proses
        </button>
        <button
          type="submit"
          name="pilihan"
          value="teruskan"
          className="rounded-md border border-gray-400 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Tetap teruskan
        </button>
      </div>
    </form>
  );
}
