"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { taskSchema } from "@/lib/pm/schema";
import { notifyTaskAssigned } from "@/lib/pm/notifications";
import { runAutomations } from "@/lib/pm/automations";
import { computeNextDueDate, shiftStartDate, type PmRecurrenceType } from "@/lib/pm/recurrence";

function pathBase(workspaceId: string, spaceId: string, listId: string) {
  return `/pm/${workspaceId}/${spaceId}/${listId}`;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Dipanggil setelah status Task berhasil diubah jadi 'done' - kalau Task
// ini diset berulang (recurrence_type terisi), Task yang SAMA di-reset
// balik ke 'to_do' dengan due_date/start_date digeser maju ke siklus
// berikutnya (bukan bikin Task baru - lihat catatan cakupan di migration
// pm_task_recurrence). Kalau recurrence_end_date terlewati, biarkan Task
// tetap 'done' (recurrence berhenti wajar, tanpa perlu aksi tambahan).
async function applyRecurrenceIfDone(supabase: SupabaseServerClient, taskId: string) {
  const { data: task } = await supabase
    .from("pm_tasks")
    .select("status, due_date, start_date, recurrence_type, recurrence_interval, recurrence_end_date")
    .eq("id", taskId)
    .single();

  if (!task || task.status !== "done" || !task.recurrence_type || !task.due_date) return;

  const nextDue = computeNextDueDate(
    task.due_date,
    task.recurrence_type as PmRecurrenceType,
    task.recurrence_interval,
  );

  if (task.recurrence_end_date && nextDue > task.recurrence_end_date) return;

  const nextStart = task.start_date ? shiftStartDate(task.start_date, task.due_date, nextDue) : null;

  await supabase
    .from("pm_tasks")
    .update({ status: "to_do", due_date: nextDue, start_date: nextStart })
    .eq("id", taskId);
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
    startDate: formData.get("startDate") || "",
    dueDate: formData.get("dueDate") || "",
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${base}?error=${encodeURIComponent(pesan)}`);
  }

  const { judul, deskripsi, status, priority, assigneeId, startDate, dueDate } = parsed.data;

  const { data: task, error } = await supabase
    .from("pm_tasks")
    .insert({
      list_id: listId,
      judul,
      deskripsi: deskripsi || null,
      status,
      priority: priority || null,
      assignee_id: assigneeId || null,
      start_date: startDate || null,
      due_date: dueDate || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !task) {
    return redirect(`${base}?error=${encodeURIComponent(error?.message ?? "Gagal membuat Task.")}`);
  }

  await notifyTaskAssigned(supabase, {
    assigneeId: assigneeId || null,
    actorId: user.id,
    taskId: task.id,
    judul,
  });

  redirect(`${base}/${task.id}`);
}

export async function updateTask(formData: FormData) {
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
  const base = pathBase(workspaceId, spaceId, listId);

  const parsed = taskSchema.safeParse({
    judul: formData.get("judul"),
    deskripsi: formData.get("deskripsi") || undefined,
    status: formData.get("status"),
    priority: formData.get("priority") || "",
    assigneeId: formData.get("assigneeId") || "",
    startDate: formData.get("startDate") || "",
    dueDate: formData.get("dueDate") || "",
    recurrenceType: formData.get("recurrenceType") || "",
    recurrenceInterval: formData.get("recurrenceInterval") || undefined,
    recurrenceEndDate: formData.get("recurrenceEndDate") || "",
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${base}/${taskId}?error=${encodeURIComponent(pesan)}`);
  }

  const {
    judul,
    deskripsi,
    status,
    priority,
    assigneeId,
    startDate,
    dueDate,
    recurrenceType,
    recurrenceInterval,
    recurrenceEndDate,
  } = parsed.data;

  const { data: existing } = await supabase
    .from("pm_tasks")
    .select("assignee_id, status")
    .eq("id", taskId)
    .single();

  const { error } = await supabase
    .from("pm_tasks")
    .update({
      judul,
      deskripsi: deskripsi || null,
      status,
      priority: priority || null,
      assignee_id: assigneeId || null,
      start_date: startDate || null,
      due_date: dueDate || null,
      recurrence_type: recurrenceType || null,
      recurrence_interval: recurrenceInterval || 1,
      recurrence_end_date: recurrenceEndDate || null,
    })
    .eq("id", taskId);

  if (error) {
    return redirect(`${base}/${taskId}?error=${encodeURIComponent(error.message)}`);
  }

  if (assigneeId && assigneeId !== existing?.assignee_id) {
    await notifyTaskAssigned(supabase, {
      assigneeId,
      actorId: user.id,
      taskId,
      judul,
    });
  }

  if (status !== existing?.status) {
    await runAutomations(supabase, {
      listId,
      taskId,
      newStatus: status,
      taskPriority: priority || null,
    });
    await applyRecurrenceIfDone(supabase, taskId);
  }

  // Simpan nilai Custom Field (B.6) yang dikirim bersama form Detail Task -
  // satu tombol Simpan untuk semuanya, bukan form terpisah per field.
  const { data: fieldDefinitions } = await supabase
    .from("pm_custom_field_definitions")
    .select("id")
    .eq("list_id", listId);

  for (const def of fieldDefinitions ?? []) {
    const raw = formData.get(`customField_${def.id}`);
    if (raw === null) continue;
    const rawStr = raw as string;
    // Checkbox custom field dipasangkan dengan hidden input fallback "off"
    // di form (lihat PmTaskDetailContent) supaya status tidak tercentang
    // tetap terkirim - "on"/"off" cuma muncul dari pasangan itu.
    const value = rawStr === "" ? null : rawStr === "on" ? "true" : rawStr === "off" ? "false" : rawStr;
    await supabase
      .from("pm_custom_field_values")
      .upsert(
        { task_id: taskId, field_definition_id: def.id, value },
        { onConflict: "task_id,field_definition_id" },
      );
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
  const { data: existing } = await supabase
    .from("pm_tasks")
    .select("list_id, priority")
    .eq("id", taskId)
    .single();

  const { error } = await supabase
    .from("pm_tasks")
    .update({ status: parsedStatus.data })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  if (existing) {
    await runAutomations(supabase, {
      listId: existing.list_id,
      taskId,
      newStatus: parsedStatus.data,
      taskPriority: existing.priority,
    });
    await applyRecurrenceIfDone(supabase, taskId);
  }
}

// Dipanggil langsung dari tabel List (edit inline, tanpa buka Task Detail) -
// pola sama seperti updateTaskStatus. Priority/Due Date tidak memicu
// runAutomations (trigger automasi cuma bereaksi ke perubahan status).
export async function updateTaskPriority(taskId: string, priority: string) {
  await requirePmAccess();

  const parsed = taskSchema.shape.priority.safeParse(priority);
  if (!parsed.success) {
    throw new Error("Priority tidak valid.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pm_tasks")
    .update({ priority: parsed.data || null })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateTaskDueDate(taskId: string, dueDate: string) {
  await requirePmAccess();

  const supabase = await createClient();
  const { error } = await supabase
    .from("pm_tasks")
    .update({ due_date: dueDate || null })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }
}

// Form tambah Subtask sengaja minimal (cuma judul) - beda dengan createTask
// yang punya form lengkap (assignee/due date/status/priority). Field lain
// bisa diisi belakangan lewat halaman/modal Task Detail milik Subtask itu
// sendiri, sama seperti Task biasa.
export async function createSubtask(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const parentTaskId = formData.get("parentTaskId") as string;
  const base = pathBase(workspaceId, spaceId, listId);

  const judul = (formData.get("judul") as string)?.trim();
  if (!judul) {
    return redirect(
      `${base}/${parentTaskId}?error=${encodeURIComponent("Judul Subtask wajib diisi")}`,
    );
  }

  const { error } = await supabase.from("pm_tasks").insert({
    list_id: listId,
    parent_task_id: parentTaskId,
    judul,
    status: "to_do",
    created_by: user.id,
  });

  if (error) {
    return redirect(`${base}/${parentTaskId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${base}/${parentTaskId}`);
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
