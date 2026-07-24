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

// Full-replace sync (bukan diff insert/delete granular) - jumlah assignee
// per Task kecil (skala ~3 orang anggota PM), jadi hapus-semua-lalu-insert-
// ulang lebih sederhana daripada hitung selisih tambah/kurang.
async function syncTaskAssignees(supabase: SupabaseServerClient, taskId: string, assigneeIds: string[]) {
  await supabase.from("pm_task_assignees").delete().eq("task_id", taskId);
  const unique = Array.from(new Set(assigneeIds.filter(Boolean)));
  if (unique.length > 0) {
    await supabase
      .from("pm_task_assignees")
      .insert(unique.map((userId) => ({ task_id: taskId, user_id: userId })));
  }
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
    assigneeIds: formData.getAll("assigneeIds"),
    startDate: formData.get("startDate") || "",
    dueDate: formData.get("dueDate") || "",
    scheduledTime: formData.get("scheduledTime") || "",
    scheduledDurationMinutes: formData.get("scheduledDurationMinutes") || "",
    recurrenceType: formData.get("recurrenceType") || "",
    recurrenceInterval: formData.get("recurrenceInterval") || undefined,
    recurrenceEndDate: formData.get("recurrenceEndDate") || "",
    color: formData.get("color") || "",
    tags: formData.get("tags") || "",
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
    assigneeIds,
    startDate,
    dueDate,
    scheduledTime,
    scheduledDurationMinutes,
    recurrenceType,
    recurrenceInterval,
    recurrenceEndDate,
    color,
    tags,
  } = parsed.data;

  const tagsArray = (tags ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { data: existing } = await supabase
    .from("pm_tasks")
    .select("status")
    .eq("id", taskId)
    .single();
  const { data: existingAssigneeRows } = await supabase
    .from("pm_task_assignees")
    .select("user_id")
    .eq("task_id", taskId);
  const existingAssigneeIds = new Set((existingAssigneeRows ?? []).map((r) => r.user_id));

  const { error } = await supabase
    .from("pm_tasks")
    .update({
      judul,
      deskripsi: deskripsi || null,
      status,
      priority: priority || null,
      start_date: startDate || null,
      due_date: dueDate || null,
      scheduled_time: scheduledTime || null,
      scheduled_duration_minutes: scheduledDurationMinutes || null,
      recurrence_type: recurrenceType || null,
      recurrence_interval: recurrenceInterval || 1,
      recurrence_end_date: recurrenceEndDate || null,
      color: color || null,
      tags: tagsArray,
    })
    .eq("id", taskId);

  if (error) {
    return redirect(`${base}/${taskId}?error=${encodeURIComponent(error.message)}`);
  }

  await syncTaskAssignees(supabase, taskId, assigneeIds ?? []);
  const newlyAdded = (assigneeIds ?? []).filter((id) => !existingAssigneeIds.has(id));
  if (newlyAdded.length > 0) {
    await notifyTaskAssigned(supabase, {
      assigneeIds: newlyAdded,
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

// Dipanggil langsung dari PmTimeBoxView (drag Task ke slot jam, atau ganti
// durasi) - `dueDate` diikutkan sekalian (bukan cuma scheduledTime) krn
// Task yg digeser dari panel "Belum dijadwalkan hari ini" kadang belum
// tentu due_date-nya PERSIS hari yang sedang dilihat (mis. drag dari
// Calendar bulan lain scr tidak sengaja) - pola sama updateTaskDueDate,
// panggilan langsung bukan <form>.
export async function scheduleTask(
  taskId: string,
  dueDate: string,
  scheduledTime: string | null,
  durationMinutes: number | null,
) {
  await requirePmAccess();

  const supabase = await createClient();
  const { error } = await supabase
    .from("pm_tasks")
    .update({
      due_date: dueDate,
      scheduled_time: scheduledTime,
      scheduled_duration_minutes: durationMinutes,
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }
}

// Dipanggil langsung dari PmCalendarView (Client Component) saat quick-add:
// klik tanggal → ketik judul → Enter, TANPA redirect ke Task Detail (beda
// dari createTask biasa) - supaya user bisa cepat menambahkan beberapa Task
// berturut-turut dulu, baru didetailkan belakangan kalau perlu. Sengaja
// minimal (judul + dueDate saja, status default "to_do") sama seperti
// createSubtask - field lain diisi lewat Task Detail kalau dibutuhkan.
export async function createTaskQuick(
  listId: string,
  judul: string,
  dueDate: string,
  // Opsional - diisi dari PmTimeBoxView (quick-add lgsg ke slot jam
  // tertentu), tetap kosong/default kalau dipanggil dari PmCalendarView
  // (quick-add per tanggal, tanpa jam) spt sebelumnya.
  scheduledTime?: string | null,
  durationMinutes?: number | null,
  // Susulan permintaan user: kalau filter assignee di Dashboard Time Box
  // sedang aktif, Task baru langsung di-assign ke assignee yg sedang
  // difilter (tanpa perlu buka Task Detail dulu) - dikirim PmTimeBoxView
  // dari prop `assigneeFilterIds`, kosong/tidak diisi di pemanggil lain.
  assigneeIds?: string[],
) {
  await requirePmAccess();

  const trimmed = judul.trim();
  if (!trimmed) {
    throw new Error("Judul Task wajib diisi.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi tidak valid.");

  const { data: task, error } = await supabase
    .from("pm_tasks")
    .insert({
      list_id: listId,
      judul: trimmed,
      status: "to_do",
      due_date: dueDate || null,
      scheduled_time: scheduledTime || null,
      scheduled_duration_minutes: scheduledTime ? (durationMinutes ?? 60) : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const uniqueAssigneeIds = Array.from(new Set((assigneeIds ?? []).filter(Boolean)));
  if (task && uniqueAssigneeIds.length > 0) {
    await supabase
      .from("pm_task_assignees")
      .insert(uniqueAssigneeIds.map((userId) => ({ task_id: task.id, user_id: userId })));
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

// Pindahkan Task ke List lain (boleh beda Space, SELAMA masih 1 Workspace
// yang sama - lintas Workspace sengaja tidak didukung, di luar cakupan
// permintaan user & bikin kompleks krn perlu mikir ulang keanggotaan/akses).
// list_id di pm_tasks satu-satunya kolom penentu (tidak ada workspace_id/
// space_id langsung di pm_tasks), jadi cukup update 1 kolom - custom field
// value & dependency lama TIDAK diikutkan/dibersihkan otomatis (biarkan apa
// adanya, List tujuan mungkin punya field berbeda - user bisa rapikan manual
// kalau perlu, bukan tanggung jawab pindah Task ini).
export async function moveTask(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const taskId = formData.get("taskId") as string;
  const targetListId = formData.get("targetListId") as string;
  const currentPath = `${pathBase(workspaceId, spaceId, listId)}/${taskId}`;

  if (!targetListId || targetListId === listId) {
    redirect(currentPath);
  }

  const { data: targetList } = await supabase
    .from("pm_lists")
    .select("space_id")
    .eq("id", targetListId)
    .single();

  if (!targetList) {
    return redirect(`${currentPath}?error=${encodeURIComponent("List tujuan tidak ditemukan.")}`);
  }

  const { error } = await supabase
    .from("pm_tasks")
    .update({ list_id: targetListId })
    .eq("id", taskId);

  if (error) {
    return redirect(`${currentPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/pm/${workspaceId}/${targetList.space_id}/${targetListId}/${taskId}`);
}
