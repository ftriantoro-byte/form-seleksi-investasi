"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";

const BUCKET = "pm-attachments";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function taskPath(workspaceId: string, spaceId: string, listId: string, taskId: string) {
  return `/pm/${workspaceId}/${spaceId}/${listId}/${taskId}`;
}

export async function uploadAttachment(formData: FormData) {
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

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return redirect(`${path}?error=${encodeURIComponent("Pilih file untuk diunggah.")}`);
  }
  if (file.size > MAX_SIZE_BYTES) {
    return redirect(`${path}?error=${encodeURIComponent("Ukuran file maksimal 10 MB.")}`);
  }

  const storagePath = `${taskId}/${crypto.randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type || undefined,
  });

  if (uploadError) {
    return redirect(`${path}?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { error: insertError } = await supabase.from("pm_attachments").insert({
    task_id: taskId,
    storage_path: storagePath,
    file_name: file.name,
    size_bytes: file.size,
    content_type: file.type || null,
    created_by: user.id,
  });

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return redirect(`${path}?error=${encodeURIComponent(insertError.message)}`);
  }

  redirect(path);
}

// Bucket private - unduh selalu lewat signed URL berumur pendek yang
// dibangkitkan saat diklik, bukan URL publik statis.
export async function downloadAttachment(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const taskId = formData.get("taskId") as string;
  const attachmentId = formData.get("attachmentId") as string;
  const path = taskPath(workspaceId, spaceId, listId, taskId);

  const { data: attachment } = await supabase
    .from("pm_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .single();

  if (!attachment) {
    return redirect(`${path}?error=${encodeURIComponent("Lampiran tidak ditemukan.")}`);
  }

  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(attachment.storage_path, 60);

  if (error || !signed) {
    return redirect(`${path}?error=${encodeURIComponent(error?.message ?? "Gagal membuat link unduhan.")}`);
  }

  redirect(signed.signedUrl);
}

export async function deleteAttachment(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const taskId = formData.get("taskId") as string;
  const attachmentId = formData.get("attachmentId") as string;
  const path = taskPath(workspaceId, spaceId, listId, taskId);

  const { data: attachment } = await supabase
    .from("pm_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .single();

  if (!attachment) {
    return redirect(`${path}?error=${encodeURIComponent("Lampiran tidak ditemukan.")}`);
  }

  const { error } = await supabase.from("pm_attachments").delete().eq("id", attachmentId);

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.storage.from(BUCKET).remove([attachment.storage_path]);

  redirect(path);
}
