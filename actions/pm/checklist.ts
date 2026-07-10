"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { checklistItemSchema } from "@/lib/pm/schema";

function taskPath(workspaceId: string, spaceId: string, listId: string, taskId: string) {
  return `/pm/${workspaceId}/${spaceId}/${listId}/${taskId}`;
}

export async function createChecklistItem(formData: FormData) {
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

  const parsed = checklistItemSchema.safeParse({ konten: formData.get("konten") });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${path}?error=${encodeURIComponent(pesan)}`);
  }

  const { error } = await supabase.from("pm_checklist_items").insert({
    task_id: taskId,
    konten: parsed.data.konten,
    created_by: user.id,
  });

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}

export async function toggleChecklistItem(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const taskId = formData.get("taskId") as string;
  const itemId = formData.get("itemId") as string;
  const path = taskPath(workspaceId, spaceId, listId, taskId);

  const { data: item } = await supabase
    .from("pm_checklist_items")
    .select("selesai")
    .eq("id", itemId)
    .single();

  if (!item) {
    return redirect(`${path}?error=${encodeURIComponent("Item checklist tidak ditemukan.")}`);
  }

  const { error } = await supabase
    .from("pm_checklist_items")
    .update({ selesai: !item.selesai })
    .eq("id", itemId);

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}

export async function deleteChecklistItem(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const taskId = formData.get("taskId") as string;
  const itemId = formData.get("itemId") as string;
  const path = taskPath(workspaceId, spaceId, listId, taskId);

  const { error } = await supabase.from("pm_checklist_items").delete().eq("id", itemId);

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}
