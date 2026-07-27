import { computeNextDueDate, shiftStartDate, type PmRecurrenceType } from "@/lib/pm/recurrence";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Dipanggil dari Server Component (List page, Dashboard, Task Detail)
// SEBELUM query Task utama - Task berulang yang sudah ditandai Done TETAP
// di due_date siklus yang baru selesai (pudar, tapi tetap kelihatan di
// tanggal itu - lihat applyRecurrenceIfDone di actions/pm/tasks.ts) SAMPAI
// tanggal itu SUNGGUHAN sudah lewat hari ini - baru di sini digeser maju ke
// siklus berikutnya + status balik ke 'to_do'. Bisa "kejar" lebih dari 1
// siklus sekaligus kalau List-nya lama tidak dibuka (mis. libur seminggu),
// TIDAK ada baris pm_task_completions baru yang dicatat utk siklus yang
// dilewati begitu saja (cuma siklus yang SUNGGUHAN diklik Done yang
// tercatat sebagai riwayat).
export async function rolloverOverdueRecurringTasks(
  supabase: SupabaseServerClient,
  listIds: string[],
) {
  if (listIds.length === 0) return;

  const today = new Date().toISOString().slice(0, 10);

  const { data: overdueRows } = await supabase
    .from("pm_tasks")
    .select("id, due_date, start_date, recurrence_type, recurrence_interval, recurrence_end_date")
    .in("list_id", listIds)
    .eq("status", "done")
    .not("recurrence_type", "is", null)
    .lt("due_date", today);

  for (const task of overdueRows ?? []) {
    if (!task.due_date || !task.recurrence_type) continue;

    let nextDue: string | null = task.due_date;
    while (nextDue && nextDue < today) {
      const candidate = computeNextDueDate(
        nextDue,
        task.recurrence_type as PmRecurrenceType,
        task.recurrence_interval,
      );
      nextDue = task.recurrence_end_date && candidate > task.recurrence_end_date ? null : candidate;
    }

    // recurrence_end_date terlewati sebelum sempat menyusul hari ini -
    // biarkan Task tetap 'done' di due_date terakhirnya (recurrence
    // berhenti wajar, sama seperti perilaku lama).
    if (!nextDue) continue;

    const nextStart = task.start_date
      ? shiftStartDate(task.start_date, task.due_date, nextDue)
      : null;

    await supabase
      .from("pm_tasks")
      .update({ status: "to_do", due_date: nextDue, start_date: nextStart })
      .eq("id", task.id);
  }
}
