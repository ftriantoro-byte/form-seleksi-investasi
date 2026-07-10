"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { listSchema } from "@/lib/pm/schema";

export async function createList(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;

  const parsed = listSchema.safeParse({
    nama: formData.get("nama"),
    deskripsi: formData.get("deskripsi") || undefined,
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`/pm/${workspaceId}/${spaceId}?error=${encodeURIComponent(pesan)}`);
  }

  const { error } = await supabase
    .from("pm_lists")
    .insert({ ...parsed.data, space_id: spaceId });

  if (error) {
    return redirect(`/pm/${workspaceId}/${spaceId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/pm/${workspaceId}/${spaceId}`);
}

export async function renameList(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;

  const parsed = listSchema.safeParse({
    nama: formData.get("nama"),
    deskripsi: formData.get("deskripsi") || undefined,
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`/pm/${workspaceId}/${spaceId}?error=${encodeURIComponent(pesan)}`);
  }

  const { error } = await supabase.from("pm_lists").update(parsed.data).eq("id", listId);

  if (error) {
    return redirect(`/pm/${workspaceId}/${spaceId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/pm/${workspaceId}/${spaceId}`);
}

export async function deleteList(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;

  const { error } = await supabase.from("pm_lists").delete().eq("id", listId);

  if (error) {
    return redirect(`/pm/${workspaceId}/${spaceId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/pm/${workspaceId}/${spaceId}`);
}
