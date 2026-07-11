"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { timeEntrySchema } from "@/lib/pm/schema";

function taskPath(workspaceId: string, spaceId: string, listId: string, taskId: string) {
  return `/pm/${workspaceId}/${spaceId}/${listId}/${taskId}`;
}

export async function createTimeEntry(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const taskId = formData.get("taskId") as string;
  const path = taskPath(workspaceId, spaceId, listId, taskId);

  const parsed = timeEntrySchema.safeParse({
    menit: formData.get("menit"),
    catatan: formData.get("catatan") || undefined,
    tanggal: formData.get("tanggal") || "",
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${path}?error=${encodeURIComponent(pesan)}`);
  }

  const { error } = await supabase.from("pm_time_entries").insert({
    task_id: taskId,
    user_id: user.id,
    menit: parsed.data.menit,
    catatan: parsed.data.catatan || null,
    ...(parsed.data.tanggal ? { tanggal: parsed.data.tanggal } : {}),
  });

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}

export async function deleteTimeEntry(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const taskId = formData.get("taskId") as string;
  const entryId = formData.get("entryId") as string;
  const path = taskPath(workspaceId, spaceId, listId, taskId);

  // RLS pm_akses_time_entry_delete_pembuat_sendiri membatasi hapus cuma ke
  // pembuat entri itu sendiri - percobaan hapus entri orang lain gagal diam
  // (0 baris terhapus), bukan error, cukup redirect balik seperti biasa.
  const { error } = await supabase.from("pm_time_entries").delete().eq("id", entryId);

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}
