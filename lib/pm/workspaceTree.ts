import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type PmMoveTargets = {
  spaces: { id: string; nama: string }[];
  folders: { id: string; nama: string; spaceId: string }[];
  lists: { id: string; nama: string; spaceId: string; folderId: string | null }[];
};

// Dipakai buat dropdown "pindahkan ke..." (Task->List lain, List->Folder/Space
// lain, Folder->Space lain) - query serupa pohon Workspace di app/pm/layout.tsx
// (sidebar) tapi versi ringan (cuma id+nama, tanpa Task) & terpisah supaya
// tiap pemanggil bisa query on-demand tanpa gantung ke render sidebar.
export async function getPmMoveTargets(
  supabase: SupabaseServerClient,
  workspaceId: string,
): Promise<PmMoveTargets> {
  const { data: spaceRows } = await supabase
    .from("pm_spaces")
    .select("id, nama, pm_folders(id, nama), pm_lists(id, nama, folder_id)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  type Row = {
    id: string;
    nama: string;
    pm_folders: { id: string; nama: string }[];
    pm_lists: { id: string; nama: string; folder_id: string | null }[];
  };
  const rows = (spaceRows ?? []) as unknown as Row[];

  return {
    spaces: rows.map((s) => ({ id: s.id, nama: s.nama })),
    folders: rows.flatMap((s) =>
      (s.pm_folders ?? []).map((f) => ({ id: f.id, nama: f.nama, spaceId: s.id })),
    ),
    lists: rows.flatMap((s) =>
      (s.pm_lists ?? []).map((l) => ({
        id: l.id,
        nama: l.nama,
        spaceId: s.id,
        folderId: l.folder_id,
      })),
    ),
  };
}
