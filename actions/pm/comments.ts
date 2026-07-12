"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { commentSchema } from "@/lib/pm/schema";
import { notifyTaskCommented, notifyMentions } from "@/lib/pm/notifications";
import { extractMentionedEmails } from "@/lib/pm/mentions";

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

  const [{ data: task }, { data: assigneeRows }] = await Promise.all([
    supabase.from("pm_tasks").select("judul").eq("id", taskId).single(),
    supabase.from("pm_task_assignees").select("user_id").eq("task_id", taskId),
  ]);

  if (task) {
    await notifyTaskCommented(supabase, {
      assigneeIds: (assigneeRows ?? []).map((r) => r.user_id),
      actorId: user.id,
      taskId,
      judul: task.judul,
    });

    const { data: anggotaRaw } = await supabase.rpc("pm_workspace_member_profiles", {
      p_workspace_id: workspaceId,
    });
    const anggota = (anggotaRaw ?? []) as { user_id: string; email: string }[];
    const mentionedEmails = extractMentionedEmails(
      parsed.data.konten,
      anggota.map((a) => a.email),
    );
    const mentionedUserIds = anggota
      .filter((a) => mentionedEmails.includes(a.email))
      .map((a) => a.user_id);

    await notifyMentions(supabase, {
      mentionedUserIds,
      actorId: user.id,
      taskId,
      judul: task.judul,
    });
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
