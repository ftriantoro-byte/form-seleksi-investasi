import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Dipanggil dari updateTask & updateTaskStatus setelah status Task berhasil
// diubah - SATU KALI, tidak rekursif (lihat catatan cakupan di migration
// 20260711130001_pm_automations.sql).
export async function runAutomations(
  supabase: SupabaseServerClient,
  params: { listId: string; taskId: string; newStatus: string; taskPriority: string | null },
) {
  const { listId, taskId, newStatus, taskPriority } = params;

  const { data: automations } = await supabase
    .from("pm_automations")
    .select("id, condition_priority, action_type, action_value")
    .eq("list_id", listId)
    .eq("trigger_status", newStatus)
    .eq("aktif", true);

  for (const automation of automations ?? []) {
    if (automation.condition_priority && automation.condition_priority !== taskPriority) {
      continue;
    }

    if (automation.action_type === "set_status" && automation.action_value) {
      await supabase.from("pm_tasks").update({ status: automation.action_value }).eq("id", taskId);
    } else if (automation.action_type === "set_assignee") {
      await supabase
        .from("pm_tasks")
        .update({ assignee_id: automation.action_value || null })
        .eq("id", taskId);
    } else if (automation.action_type === "set_priority") {
      await supabase
        .from("pm_tasks")
        .update({ priority: automation.action_value || null })
        .eq("id", taskId);
    }
  }
}
