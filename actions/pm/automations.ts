"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";

function listPath(workspaceId: string, spaceId: string, listId: string) {
  return `/pm/${workspaceId}/${spaceId}/${listId}`;
}

export async function createAutomation(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const path = listPath(workspaceId, spaceId, listId);

  const nama = (formData.get("nama") as string)?.trim();
  const triggerStatus = formData.get("triggerStatus") as string;
  const conditionPriority = (formData.get("conditionPriority") as string) || null;
  const actionType = formData.get("actionType") as string;

  if (!nama || !triggerStatus || !actionType) {
    return redirect(`${path}?error=${encodeURIComponent("Nama, Trigger, dan Action wajib diisi.")}`);
  }

  const actionValue =
    actionType === "set_status"
      ? (formData.get("actionStatusValue") as string)
      : actionType === "set_assignee"
        ? (formData.get("actionAssigneeValue") as string) || null
        : actionType === "set_priority"
          ? (formData.get("actionPriorityValue") as string) || null
          : null;

  const { error } = await supabase.from("pm_automations").insert({
    list_id: listId,
    nama,
    trigger_status: triggerStatus,
    condition_priority: conditionPriority,
    action_type: actionType,
    action_value: actionValue,
  });

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}

export async function toggleAutomation(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const automationId = formData.get("automationId") as string;
  const path = listPath(workspaceId, spaceId, listId);

  const { data: automation } = await supabase
    .from("pm_automations")
    .select("aktif")
    .eq("id", automationId)
    .single();

  if (!automation) {
    return redirect(`${path}?error=${encodeURIComponent("Automasi tidak ditemukan.")}`);
  }

  const { error } = await supabase
    .from("pm_automations")
    .update({ aktif: !automation.aktif })
    .eq("id", automationId);

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}

export async function deleteAutomation(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const automationId = formData.get("automationId") as string;
  const path = listPath(workspaceId, spaceId, listId);

  const { error } = await supabase.from("pm_automations").delete().eq("id", automationId);

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}
