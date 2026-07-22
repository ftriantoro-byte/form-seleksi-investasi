import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// List "Inbox" per Workspace - tujuan default quick-add Task dari Time Box
// level Workspace saat user belum/tidak pilih List spesifik (susulan
// permintaan user: "task bisa ditambahkan tanpa mengalokasikan folder/list
// terlebih dahulu"). pm_tasks.list_id TETAP not null (skema tidak diubah),
// jadi Task tetap butuh List - Inbox ini yg jadi "rumah sementara"-nya,
// dirapikan belakangan lewat fitur "Pindahkan ke List" (moveTask) yg sudah
// ada. Dibuat LAZY (baru di-provision Space+List-nya pas PERTAMA KALI
// dibutuhkan, bukan otomatis tiap Workspace baru) - pola sama dgn Doc
// kolaboratif per Task di PmTaskDetailContent (insert lazy saat pertama
// kali dibuka, disematkan sbg efek samping render Server Component, bukan
// lewat Server Action terpisah - sudah precedented di codebase ini).
export async function getOrCreateInboxListId(
  supabase: SupabaseServerClient,
  workspaceId: string,
): Promise<string | null> {
  const { data: workspace } = await supabase
    .from("pm_workspaces")
    .select("inbox_list_id")
    .eq("id", workspaceId)
    .single();

  if (workspace?.inbox_list_id) {
    return workspace.inbox_list_id;
  }

  const { data: space, error: spaceError } = await supabase
    .from("pm_spaces")
    .insert({ workspace_id: workspaceId, nama: "Inbox" })
    .select("id")
    .single();

  if (spaceError || !space) return null;

  const { data: list, error: listError } = await supabase
    .from("pm_lists")
    .insert({ space_id: space.id, nama: "Inbox" })
    .select("id")
    .single();

  if (listError || !list) return null;

  await supabase.from("pm_workspaces").update({ inbox_list_id: list.id }).eq("id", workspaceId);

  return list.id;
}
