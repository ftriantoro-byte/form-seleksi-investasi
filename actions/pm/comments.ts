"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { commentSchema } from "@/lib/pm/schema";

function taskPath(workspaceId: string, spaceId: string, listId: string, taskId: string) {
  return `/pm/${workspaceId}/${spaceId}/${listId}/${taskId}`;
}

export async function createComment(formData: FormData) {
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

  const parsed = commentSchema.safeParse({ konten: formData.get("konten") });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${path}?error=${encodeURIComponent(pesan)}`);
  }

  const { error } = await supabase.from("pm_comments").insert({
    task_id: taskId,
    konten: parsed.data.konten,
    created_by: user.id,
  });

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}

export async function deleteComment(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const taskId = formData.get("taskId") as string;
  const commentId = formData.get("commentId") as string;
  const path = taskPath(workspaceId, spaceId, listId, taskId);

  const { error } = await supabase.from("pm_comments").delete().eq("id", commentId);

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}
