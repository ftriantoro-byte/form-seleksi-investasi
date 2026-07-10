"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { listSchema } from "@/lib/pm/schema";

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
