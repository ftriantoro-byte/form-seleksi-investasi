"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { whiteboardSchema, STICKY_COLOR_VALUES } from "@/lib/pm/schema";

const PM_LAYOUT_PATH = "/pm";

export async function createWhiteboard(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const spacePath = `/pm/${workspaceId}/${spaceId}`;

  const parsed = whiteboardSchema.safeParse({ nama: formData.get("nama") });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${spacePath}?error=${encodeURIComponent(pesan)}`);
  }

  const { data: whiteboard, error } = await supabase
    .from("pm_whiteboards")
    .insert({ space_id: spaceId, nama: parsed.data.nama, created_by: user.id })
    .select("id")
    .single();

  if (error || !whiteboard) {
    return redirect(
      `${spacePath}?error=${encodeURIComponent(error?.message ?? "Gagal membuat Whiteboard.")}`,
    );
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(`${spacePath}/whiteboard/${whiteboard.id}`);
}

export async function deleteWhiteboard(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const whiteboardId = formData.get("whiteboardId") as string;
  const spacePath = `/pm/${workspaceId}/${spaceId}`;

  const { error } = await supabase.from("pm_whiteboards").delete().eq("id", whiteboardId);

  if (error) {
    return redirect(`${spacePath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(spacePath);
}

// Dipanggil langsung (bukan lewat <form>) dari PmWhiteboardCanvas (Client
// Component) - sticky note dibuat saat kanvas kosong diklik, posisi dari
// koordinat klik itu sendiri (persentase 0-100 lebar/tinggi kanvas).
export async function createStickyNote(whiteboardId: string, posX: number, posY: number) {
  await requirePmAccess();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Tidak terautentikasi.");

  const { error } = await supabase.from("pm_whiteboard_items").insert({
    whiteboard_id: whiteboardId,
    pos_x: Math.min(Math.max(posX, 0), 96),
    pos_y: Math.min(Math.max(posY, 0), 92),
    created_by: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateStickyPosition(itemId: string, posX: number, posY: number) {
  await requirePmAccess();

  const supabase = await createClient();
  const { error } = await supabase
    .from("pm_whiteboard_items")
    .update({ pos_x: Math.min(Math.max(posX, 0), 96), pos_y: Math.min(Math.max(posY, 0), 92) })
    .eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateStickyContent(itemId: string, konten: string) {
  await requirePmAccess();

  const supabase = await createClient();
  const { error } = await supabase
    .from("pm_whiteboard_items")
    .update({ konten })
    .eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateStickyColor(itemId: string, warna: string) {
  await requirePmAccess();

  const parsedWarna = STICKY_COLOR_VALUES.includes(warna as (typeof STICKY_COLOR_VALUES)[number])
    ? warna
    : "yellow";

  const supabase = await createClient();
  const { error } = await supabase
    .from("pm_whiteboard_items")
    .update({ warna: parsedWarna })
    .eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteStickyNote(itemId: string) {
  await requirePmAccess();

  const supabase = await createClient();
  const { error } = await supabase.from("pm_whiteboard_items").delete().eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }
}

// Konversi sticky note jadi Task sungguhan (C.3) - sticky TETAP ada di papan
// (task_id diisi), tidak dihapus, supaya jejak sumbernya tidak hilang.
export async function convertStickyToTask(itemId: string, listId: string) {
  await requirePmAccess();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Tidak terautentikasi.");

  const { data: item } = await supabase
    .from("pm_whiteboard_items")
    .select("konten, task_id")
    .eq("id", itemId)
    .single();

  if (!item) throw new Error("Sticky note tidak ditemukan.");
  if (item.task_id) throw new Error("Sticky note ini sudah jadi Task.");

  const judul = item.konten?.trim() || "(Tanpa judul)";

  const { data: task, error: taskError } = await supabase
    .from("pm_tasks")
    .insert({ list_id: listId, judul, status: "to_do", created_by: user.id })
    .select("id")
    .single();

  if (taskError || !task) {
    throw new Error(taskError?.message ?? "Gagal membuat Task.");
  }

  const { error: updateError } = await supabase
    .from("pm_whiteboard_items")
    .update({ task_id: task.id })
    .eq("id", itemId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}
