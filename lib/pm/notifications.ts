import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Notifikasi bersifat best-effort: kegagalan insert (mis. RLS menolak kasus
// tepi yang tidak terduga) sengaja TIDAK menggagalkan aksi utama (assign
// Task / kirim komentar) - makanya error dari insert ini tidak dicek/redirect
// seperti mutasi utama lain di modul PM.

export async function notifyTaskAssigned(
  supabase: SupabaseServerClient,
  params: { assigneeId: string | null; actorId: string; taskId: string; judul: string },
) {
  const { assigneeId, actorId, taskId, judul } = params;
  if (!assigneeId || assigneeId === actorId) return;

  await supabase.from("pm_notifications").insert({
    user_id: assigneeId,
    type: "task_assigned",
    task_id: taskId,
    pesan: `Anda ditugaskan ke Task "${judul}".`,
  });
}

export async function notifyTaskCommented(
  supabase: SupabaseServerClient,
  params: { assigneeId: string | null; actorId: string; taskId: string; judul: string },
) {
  const { assigneeId, actorId, taskId, judul } = params;
  if (!assigneeId || assigneeId === actorId) return;

  await supabase.from("pm_notifications").insert({
    user_id: assigneeId,
    type: "task_commented",
    task_id: taskId,
    pesan: `Ada komentar baru di Task "${judul}".`,
  });
}

export async function notifyMentions(
  supabase: SupabaseServerClient,
  params: { mentionedUserIds: string[]; actorId: string; taskId: string; judul: string },
) {
  const { mentionedUserIds, actorId, taskId, judul } = params;
  const targets = mentionedUserIds.filter((id) => id !== actorId);
  if (targets.length === 0) return;

  await supabase.from("pm_notifications").insert(
    targets.map((userId) => ({
      user_id: userId,
      type: "mention" as const,
      task_id: taskId,
      pesan: `Anda di-mention di komentar Task "${judul}".`,
    })),
  );
}
