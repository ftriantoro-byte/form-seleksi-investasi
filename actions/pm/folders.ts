"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { folderSchema } from "@/lib/pm/schema";

// Lihat catatan PM_LAYOUT_PATH di actions/pm/workspaces.ts.
const PM_LAYOUT_PATH = "/pm";

export async function createFolder(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;

  const parsed = folderSchema.safeParse({
    nama: formData.get("nama"),
    deskripsi: formData.get("deskripsi") || undefined,
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`/pm/${workspaceId}/${spaceId}?error=${encodeURIComponent(pesan)}`);
  }

  const { data: folder, error } = await supabase
    .from("pm_folders")
    .insert({ ...parsed.data, space_id: spaceId })
    .select("id")
    .single();

  if (error || !folder) {
    return redirect(
      `/pm/${workspaceId}/${spaceId}?error=${encodeURIComponent(error?.message ?? "Gagal membuat Folder.")}`,
    );
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(`/pm/${workspaceId}/${spaceId}/folder/${folder.id}`);
}

export async function renameFolder(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const folderId = formData.get("folderId") as string;

  const parsed = folderSchema.safeParse({
    nama: formData.get("nama"),
    deskripsi: formData.get("deskripsi") || undefined,
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(
      `/pm/${workspaceId}/${spaceId}/folder/${folderId}?error=${encodeURIComponent(pesan)}`,
    );
  }

  const { error } = await supabase.from("pm_folders").update(parsed.data).eq("id", folderId);

  if (error) {
    return redirect(
      `/pm/${workspaceId}/${spaceId}/folder/${folderId}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(`/pm/${workspaceId}/${spaceId}/folder/${folderId}`);
}

export async function deleteFolder(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const folderId = formData.get("folderId") as string;

  const { error } = await supabase.from("pm_folders").delete().eq("id", folderId);

  if (error) {
    return redirect(
      `/pm/${workspaceId}/${spaceId}/folder/${folderId}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(`/pm/${workspaceId}/${spaceId}`);
}
