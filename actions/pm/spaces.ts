"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { spaceSchema } from "@/lib/pm/schema";

export async function createSpace(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;

  const parsed = spaceSchema.safeParse({
    nama: formData.get("nama"),
    deskripsi: formData.get("deskripsi") || undefined,
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`/pm/${workspaceId}?error=${encodeURIComponent(pesan)}`);
  }

  const { error } = await supabase
    .from("pm_spaces")
    .insert({ ...parsed.data, workspace_id: workspaceId });

  if (error) {
    return redirect(`/pm/${workspaceId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/pm/${workspaceId}`);
}

export async function renameSpace(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;

  const parsed = spaceSchema.safeParse({
    nama: formData.get("nama"),
    deskripsi: formData.get("deskripsi") || undefined,
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`/pm/${workspaceId}/${spaceId}?error=${encodeURIComponent(pesan)}`);
  }

  const { error } = await supabase.from("pm_spaces").update(parsed.data).eq("id", spaceId);

  if (error) {
    return redirect(`/pm/${workspaceId}/${spaceId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/pm/${workspaceId}/${spaceId}`);
}

export async function deleteSpace(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;

  const { error } = await supabase.from("pm_spaces").delete().eq("id", spaceId);

  if (error) {
    return redirect(`/pm/${workspaceId}/${spaceId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/pm/${workspaceId}`);
}
