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

// Pindahkan Folder ke Space lain (Workspace yang sama). space_id di
// pm_lists tetap sumber otorisasi utama RLS (lihat catatan migration B.1
// pm_folder_dan_subtask.sql) - kalau Folder pindah Space, List-List di
// dalamnya HARUS ikut disinkron space_id-nya, bukan cuma folder.space_id,
// supaya tidak nyisa data List yang space_id-nya beda dari Folder induknya.
export async function moveFolder(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const folderId = formData.get("folderId") as string;
  const targetSpaceId = formData.get("targetSpaceId") as string;
  const currentPath = `/pm/${workspaceId}/${spaceId}/folder/${folderId}`;

  if (!targetSpaceId || targetSpaceId === spaceId) {
    return redirect(currentPath);
  }

  const { error: folderError } = await supabase
    .from("pm_folders")
    .update({ space_id: targetSpaceId })
    .eq("id", folderId);

  if (folderError) {
    return redirect(`${currentPath}?error=${encodeURIComponent(folderError.message)}`);
  }

  const { error: listsError } = await supabase
    .from("pm_lists")
    .update({ space_id: targetSpaceId })
    .eq("folder_id", folderId);

  if (listsError) {
    return redirect(`${currentPath}?error=${encodeURIComponent(listsError.message)}`);
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(`/pm/${workspaceId}/${targetSpaceId}/folder/${folderId}`);
}

// Ubah Folder jadi Space baru (promosi 1 level): bikin Space baru bernama
// sama, semua List yang tadinya langsung di Folder ini jadi List langsung
// di Space baru (folder_id null), Folder lama dihapus. Skema cuma Space->
// Folder->List (tidak ada Folder bersarang), jadi tidak ada Folder anak yang
// perlu diurus. Dari sini user bisa bikin Folder baru di Space baru & pakai
// "Pindahkan List ke..." (moveList) buat mengelompokkan List-List itu lagi.
export async function convertFolderToSpace(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const folderId = formData.get("folderId") as string;
  const currentPath = `/pm/${workspaceId}/${spaceId}/folder/${folderId}`;

  const { data: folder } = await supabase
    .from("pm_folders")
    .select("nama")
    .eq("id", folderId)
    .single();

  if (!folder) {
    return redirect(`${currentPath}?error=${encodeURIComponent("Folder tidak ditemukan.")}`);
  }

  const { data: newSpace, error: spaceError } = await supabase
    .from("pm_spaces")
    .insert({ workspace_id: workspaceId, nama: folder.nama })
    .select("id")
    .single();

  if (spaceError || !newSpace) {
    return redirect(
      `${currentPath}?error=${encodeURIComponent(spaceError?.message ?? "Gagal membuat Space.")}`,
    );
  }

  const { error: listsError } = await supabase
    .from("pm_lists")
    .update({ space_id: newSpace.id, folder_id: null })
    .eq("folder_id", folderId);

  if (listsError) {
    return redirect(`${currentPath}?error=${encodeURIComponent(listsError.message)}`);
  }

  const { error: deleteError } = await supabase.from("pm_folders").delete().eq("id", folderId);

  if (deleteError) {
    return redirect(`${currentPath}?error=${encodeURIComponent(deleteError.message)}`);
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(`/pm/${workspaceId}/${newSpace.id}`);
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
