"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { meetingSchema, actionItemSchema } from "@/lib/pm/schema";

const PM_LAYOUT_PATH = "/pm";

function meetingsPath(workspaceId: string) {
  return `/pm/${workspaceId}/meetings`;
}

function meetingPath(workspaceId: string, meetingId: string) {
  return `/pm/${workspaceId}/meetings/${meetingId}`;
}

export async function createMeeting(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = (formData.get("spaceId") as string) || null;
  const path = meetingsPath(workspaceId);

  const parsed = meetingSchema.safeParse({
    judul: formData.get("judul"),
    meetingDate: formData.get("meetingDate") || "",
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${path}?error=${encodeURIComponent(pesan)}`);
  }

  const { data: meeting, error } = await supabase
    .from("pm_meetings")
    .insert({
      workspace_id: workspaceId,
      space_id: spaceId,
      judul: parsed.data.judul,
      meeting_date: parsed.data.meetingDate || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !meeting) {
    return redirect(`${path}?error=${encodeURIComponent(error?.message ?? "Gagal membuat Meeting.")}`);
  }

  const attendeeIds = formData.getAll("attendeeIds") as string[];
  if (attendeeIds.length > 0) {
    await supabase
      .from("pm_meeting_attendees")
      .insert(attendeeIds.map((userId) => ({ meeting_id: meeting.id, user_id: userId })));
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(meetingPath(workspaceId, meeting.id));
}

export async function deleteMeeting(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const meetingId = formData.get("meetingId") as string;
  const path = meetingsPath(workspaceId);

  const { error } = await supabase.from("pm_meetings").delete().eq("id", meetingId);

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(path);
}

// Dipanggil langsung dari PmCollaborativeDoc (kind="meeting"), didebounce
// ~1.5 detik di klien - pola identik saveDocState (B.5), cuma kolom
// crdt_state ada langsung di baris pm_meetings (bukan tabel pm_docs terpisah).
export async function saveMeetingState(meetingId: string, stateBase64: string) {
  await requirePmAccess();

  const supabase = await createClient();
  const hexLiteral = "\\x" + Buffer.from(stateBase64, "base64").toString("hex");

  const { error } = await supabase
    .from("pm_meetings")
    .update({ crdt_state: hexLiteral })
    .eq("id", meetingId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createActionItem(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const meetingId = formData.get("meetingId") as string;
  const path = meetingPath(workspaceId, meetingId);

  const parsed = actionItemSchema.safeParse({
    deskripsi: formData.get("deskripsi"),
    assigneeId: formData.get("assigneeId") || "",
    dueDate: formData.get("dueDate") || "",
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${path}?error=${encodeURIComponent(pesan)}`);
  }

  const { error } = await supabase.from("pm_meeting_action_items").insert({
    meeting_id: meetingId,
    deskripsi: parsed.data.deskripsi,
    assignee_id: parsed.data.assigneeId || null,
    due_date: parsed.data.dueDate || null,
  });

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}

// Dipanggil langsung (bukan lewat <form>) dari PmActionItemList (Client
// Component) - pola identik deleteStickyNote (C.3), supaya konsisten dengan
// tombol Hapus & konversi lain di panel Action Item yang sama.
export async function deleteActionItem(itemId: string) {
  await requirePmAccess();

  const supabase = await createClient();
  const { error } = await supabase.from("pm_meeting_action_items").delete().eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }
}

// Dipanggil langsung (bukan lewat <form>) - pola identik convertStickyToTask
// (C.3). Assignee & due date action item ikut ter-isi ke Task barunya.
export async function convertActionItemToTask(itemId: string, listId: string) {
  await requirePmAccess();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Tidak terautentikasi.");

  const { data: item } = await supabase
    .from("pm_meeting_action_items")
    .select("deskripsi, assignee_id, due_date, task_id")
    .eq("id", itemId)
    .single();

  if (!item) throw new Error("Action item tidak ditemukan.");
  if (item.task_id) throw new Error("Action item ini sudah jadi Task.");

  const { data: task, error: taskError } = await supabase
    .from("pm_tasks")
    .insert({
      list_id: listId,
      judul: item.deskripsi,
      assignee_id: item.assignee_id,
      due_date: item.due_date,
      status: "to_do",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (taskError || !task) {
    throw new Error(taskError?.message ?? "Gagal membuat Task.");
  }

  const { error: updateError } = await supabase
    .from("pm_meeting_action_items")
    .update({ task_id: task.id })
    .eq("id", itemId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}
