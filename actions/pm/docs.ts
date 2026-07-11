"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";

// Dipanggil langsung dari PmCollaborativeDoc (Client Component), didebounce
// ~1.5 detik di sisi klien - lihat PM-MODULE-SPEC.md §5. Bukan lewat
// <form action>, jadi tidak redirect; kegagalan cukup dilempar sebagai Error
// (persistensi berkala, sinkron LIVE antar client tetap jalan lewat
// Broadcast terlepas dari ini berhasil/gagal).
export async function saveDocState(docId: string, stateBase64: string) {
  await requirePmAccess();

  const supabase = await createClient();
  const hexLiteral = "\\x" + Buffer.from(stateBase64, "base64").toString("hex");

  const { error } = await supabase
    .from("pm_docs")
    .update({ crdt_state: hexLiteral })
    .eq("id", docId);

  if (error) {
    throw new Error(error.message);
  }
}
