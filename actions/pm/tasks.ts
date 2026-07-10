"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { taskSchema } from "@/lib/pm/schema";

function pathBase(workspaceId: string, spaceId: string, listId: string) {
  return `/pm/${workspaceId}/${spaceId}/${listId}`;
}

export async function createTask(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const base = pathBase(workspaceId, spaceId, listId);

  const parsed = taskSchema.safeParse({
    judul: formData.get("judul"),
    deskripsi: formData.get("deskripsi") || undefined,
    status: formData.get("status"),
    priority: formData.get("priority") || "",
    assigneeId: formData.get("assigneeId") || "",
    dueDate: formData.get("dueDate") || "",
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${base}?error=${encodeURIComponent(pesan)}`);
  }

  const { judul, deskripsi, status, priority, assigneeId, dueDate } = parsed.data;

  const { data: task, error } = await supabase
    .from("pm_tasks")
    .insert({
      list_id: listId,
      judul,
      deskripsi: deskripsi || null,
      status,
      priority: priority || null,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !task) {
    return redirect(`${base}?error=${encodeURIComponent(error?.message ?? "Gagal membuat Task.")}`);
  }

  redirect(`${base}/${task.id}`);
}

export async function updateTask(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const taskId = formData.get("taskId") as string;
  const base = pathBase(workspaceId, spaceId, listId);

  const parsed = taskSchema.safeParse({
    judul: formData.get("judul"),
    deskripsi: formData.get("deskripsi") || undefined,
    status: formData.get("status"),
    priority: formData.get("priority") || "",
    assigneeId: formData.get("assigneeId") || "",
    dueDate: formData.get("dueDate") || "",
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${base}/${taskId}?error=${encodeURIComponent(pesan)}`);
  }

  const { judul, deskripsi, status, priority, assigneeId, dueDate } = parsed.data;

  const { error } = await supabase
    .from("pm_tasks")
    .update({
      judul,
      deskripsi: deskripsi || null,
      status,
      priority: priority || null,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
    })
    .eq("id", taskId);

  if (error) {
    return redirect(`${base}/${taskId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${base}/${taskId}`);
}

// Dipanggil langsung (bukan lewat <form action>) dari PmBoardView (Client
// Component, drag-and-drop) saat kartu Task dipindah ke kolom status lain.
export async function updateTaskStatus(taskId: string, status: string) {
  await requirePmAccess();

  const parsedStatus = taskSchema.shape.status.safeParse(status);
  if (!parsedStatus.success) {
    throw new Error("Status tidak valid.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pm_tasks")
    .update({ status: parsedStatus.data })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteTask(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const taskId = formData.get("taskId") as string;
  const base = pathBase(workspaceId, spaceId, listId);

  const { error } = await supabase.from("pm_tasks").delete().eq("id", taskId);

  if (error) {
    return redirect(`${base}/${taskId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(base);
}
