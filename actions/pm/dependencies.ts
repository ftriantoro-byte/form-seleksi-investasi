"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";

function taskPath(workspaceId: string, spaceId: string, listId: string, taskId: string) {
  return `/pm/${workspaceId}/${spaceId}/${listId}/${taskId}`;
}

export async function addDependency(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const taskId = formData.get("taskId") as string;
  const dependsOnTaskId = formData.get("dependsOnTaskId") as string;
  const path = taskPath(workspaceId, spaceId, listId, taskId);

  if (!dependsOnTaskId || dependsOnTaskId === taskId) {
    return redirect(`${path}?error=${encodeURIComponent("Pilih Task lain yang valid.")}`);
  }

  // Kedua Task harus di List yang sama - Gantt/dependency sengaja dibatasi
  // dalam satu List supaya tidak perlu resolusi lintas-List yang rumit.
  const { data: target } = await supabase
    .from("pm_tasks")
    .select("list_id")
    .eq("id", dependsOnTaskId)
    .single();

  if (!target || target.list_id !== listId) {
    return redirect(
      `${path}?error=${encodeURIComponent("Task yang dipilih harus berada di List yang sama.")}`,
    );
  }

  const { error } = await supabase
    .from("pm_task_dependencies")
    .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId });

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}

export async function removeDependency(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const taskId = formData.get("taskId") as string;
  const dependencyId = formData.get("dependencyId") as string;
  const path = taskPath(workspaceId, spaceId, listId, taskId);

  const { error } = await supabase.from("pm_task_dependencies").delete().eq("id", dependencyId);

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}
