"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePmAdmin } from "@/lib/pm/access";
import { workspaceSchema } from "@/lib/pm/schema";

// app/pm/layout.tsx bertanggung jawab atas pohon navigasi sidebar (Workspace/
// Space/List) - Next.js tidak otomatis refetch data layout saat navigasi
// antar halaman di bawahnya, jadi tiap mutasi Workspace/Space/List/anggota
// harus revalidate path ini agar sidebar ikut ter-update.
const PM_LAYOUT_PATH = "/pm";

export async function createWorkspace(formData: FormData) {
  await requirePmAdmin();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const parsed = workspaceSchema.safeParse({
    nama: formData.get("nama"),
    deskripsi: formData.get("deskripsi") || undefined,
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`/pm?error=${encodeURIComponent(pesan)}`);
  }

  const { data: workspace, error } = await supabase
    .from("pm_workspaces")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();

  if (error || !workspace) {
    return redirect(
      `/pm?error=${encodeURIComponent(error?.message ?? "Gagal membuat Workspace.")}`,
    );
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(`/pm/${workspace.id}`);
}

export async function renameWorkspace(formData: FormData) {
  await requirePmAdmin();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;

  const parsed = workspaceSchema.safeParse({
    nama: formData.get("nama"),
    deskripsi: formData.get("deskripsi") || undefined,
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`/pm/${workspaceId}?error=${encodeURIComponent(pesan)}`);
  }

  const { error } = await supabase
    .from("pm_workspaces")
    .update(parsed.data)
    .eq("id", workspaceId);

  if (error) {
    return redirect(`/pm/${workspaceId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(`/pm/${workspaceId}`);
}

export async function deleteWorkspace(formData: FormData) {
  await requirePmAdmin();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;

  const { error } = await supabase.from("pm_workspaces").delete().eq("id", workspaceId);

  if (error) {
    return redirect(`/pm/${workspaceId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect("/pm");
}

export async function addWorkspaceMember(formData: FormData) {
  await requirePmAdmin();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const userId = formData.get("userId") as string;

  const { error } = await supabase
    .from("pm_workspace_members")
    .insert({ workspace_id: workspaceId, user_id: userId });

  if (error) {
    return redirect(`/pm/${workspaceId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(`/pm/${workspaceId}`);
}

export async function removeWorkspaceMember(formData: FormData) {
  await requirePmAdmin();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const userId = formData.get("userId") as string;

  const { error } = await supabase
    .from("pm_workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    return redirect(`/pm/${workspaceId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(`/pm/${workspaceId}`);
}
