import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { SubmissionPdf } from "@/lib/forms/seleksi-investasi/pdf/SubmissionPdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await params;
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, status, total_skor, dibuat_pada, data")
    .eq("id", submissionId)
    .single();

  if (!submission) {
    return NextResponse.json({ error: "Proposal tidak ditemukan" }, { status: 404 });
  }

  const { data: approvalChainRaw } = await supabase
    .from("approval_chain")
    .select(
      "tingkat, status, approver_user_id, catatan, diteruskan_meski_ditolak, diputuskan_pada",
    )
    .eq("submission_id", submissionId);

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

  const urutan = ["manajer", "vp", "direksi"] as const;
  const approvalChain = urutan.map((tingkat) => {
    const baris = approvalChainRaw?.find((a) => a.tingkat === tingkat);
    if (!baris) return null;
    return {
      ...baris,
      namaApprover: baris.approver_user_id
        ? (namaApprover.get(baris.approver_user_id) ?? null)
        : null,
    };
  });

  const document = createElement(SubmissionPdf, {
    submission,
    approvalChain,
  }) as unknown as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(document);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="proposal-${submission.id}.pdf"`,
    },
  });
}
