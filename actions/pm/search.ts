"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";

export type PmSearchResult = {
  type: "workspace" | "space" | "list" | "task" | "meeting";
  label: string;
  href: string;
};

// RLS pada pm_workspaces/pm_spaces/pm_lists/pm_tasks otomatis membatasi hasil
// ke yang boleh diakses user saat ini - tidak perlu filter tambahan di sini
// selain requirePmAccess() (memastikan pemanggil anggota modul PM sama sekali).
export async function searchPm(query: string): Promise<PmSearchResult[]> {
  await requirePmAccess();

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const supabase = await createClient();
  const like = `%${trimmed}%`;

  const [{ data: workspaces }, { data: spaces }, { data: lists }, { data: tasks }, { data: meetings }] =
    await Promise.all([
      supabase.from("pm_workspaces").select("id, nama").ilike("nama", like).limit(5),
      supabase
        .from("pm_spaces")
        .select("id, nama, workspace_id")
        .ilike("nama", like)
        .limit(5),
      supabase
        .from("pm_lists")
        .select("id, nama, space_id, pm_spaces(workspace_id)")
        .ilike("nama", like)
        .limit(5),
      supabase
        .from("pm_tasks")
        .select("id, judul, list_id, pm_lists(space_id, pm_spaces(workspace_id))")
        .ilike("judul", like)
        .limit(8),
      supabase
        .from("pm_meetings")
        .select("id, judul, workspace_id")
        .ilike("judul", like)
        .limit(5),
    ]);

  const results: PmSearchResult[] = [];

  for (const w of workspaces ?? []) {
    results.push({ type: "workspace", label: w.nama, href: `/pm/${w.id}` });
  }

  for (const s of spaces ?? []) {
    results.push({ type: "space", label: s.nama, href: `/pm/${s.workspace_id}/${s.id}` });
  }

  for (const l of lists ?? []) {
    const space = l.pm_spaces as unknown as { workspace_id: string } | null;
    if (!space) continue;
    results.push({
      type: "list",
      label: l.nama,
      href: `/pm/${space.workspace_id}/${l.space_id}/${l.id}`,
    });
  }

  for (const t of tasks ?? []) {
    const list = t.pm_lists as unknown as {
      space_id: string;
      pm_spaces: { workspace_id: string } | null;
    } | null;
    if (!list?.pm_spaces) continue;
    results.push({
      type: "task",
      label: t.judul,
      href: `/pm/${list.pm_spaces.workspace_id}/${list.space_id}/${t.list_id}/${t.id}`,
    });
  }

  for (const m of meetings ?? []) {
    results.push({
      type: "meeting",
      label: m.judul,
      href: `/pm/${m.workspace_id}/meetings/${m.id}`,
    });
  }

  return results;
}
