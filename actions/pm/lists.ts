"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { listSchema, TASK_STATUS_VALUES } from "@/lib/pm/schema";

// Lihat catatan PM_LAYOUT_PATH di actions/pm/workspaces.ts.
const PM_LAYOUT_PATH = "/pm";

// List boleh langsung di bawah Space (folderId kosong) atau di dalam Folder
// (folderId diisi, tahap B.1) - redirect balik ke halaman yang sesuai.
function listParentPath(workspaceId: string, spaceId: string, folderId?: string | null) {
  return folderId
    ? `/pm/${workspaceId}/${spaceId}/folder/${folderId}`
    : `/pm/${workspaceId}/${spaceId}`;
}

export async function createList(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const folderId = (formData.get("folderId") as string) || null;
  const parentPath = listParentPath(workspaceId, spaceId, folderId);

  const parsed = listSchema.safeParse({
    nama: formData.get("nama"),
    deskripsi: formData.get("deskripsi") || undefined,
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${parentPath}?error=${encodeURIComponent(pesan)}`);
  }

  const { error } = await supabase
    .from("pm_lists")
    .insert({ ...parsed.data, space_id: spaceId, folder_id: folderId });

  if (error) {
    return redirect(`${parentPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(parentPath);
}

export async function renameList(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const folderId = (formData.get("folderId") as string) || null;
  const parentPath = listParentPath(workspaceId, spaceId, folderId);

  const parsed = listSchema.safeParse({
    nama: formData.get("nama"),
    deskripsi: formData.get("deskripsi") || undefined,
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${parentPath}?error=${encodeURIComponent(pesan)}`);
  }

  const { error } = await supabase.from("pm_lists").update(parsed.data).eq("id", listId);

  if (error) {
    return redirect(`${parentPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(parentPath);
}

// B.6: label kustom untuk 4 status baku (bukan status arbitrer baru - lihat
// catatan cakupan di migration 20260711120001_pm_custom_fields_dan_status.sql).
export async function updateStatusLabels(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  // Halaman List selalu /pm/{ws}/{space}/{listId} terlepas dari Folder -
  // BUKAN listParentPath() (itu untuk redirect ke Space/Folder, bukan List).
  const listPath = `/pm/${workspaceId}/${spaceId}/${listId}`;

  const overrides: Record<string, string> = {};
  for (const key of TASK_STATUS_VALUES) {
    const value = (formData.get(`label_${key}`) as string)?.trim();
    if (value) overrides[key] = value;
  }

  const { error } = await supabase
    .from("pm_lists")
    .update({ custom_status_labels: Object.keys(overrides).length > 0 ? overrides : null })
    .eq("id", listId);

  if (error) {
    return redirect(`${listPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(listPath);
}

export async function deleteList(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const folderId = (formData.get("folderId") as string) || null;
  const parentPath = listParentPath(workspaceId, spaceId, folderId);

  const { error } = await supabase.from("pm_lists").delete().eq("id", listId);

  if (error) {
    return redirect(`${parentPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(parentPath);
}
