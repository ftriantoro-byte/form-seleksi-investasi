import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Notifikasi bersifat best-effort: kegagalan insert (mis. RLS menolak kasus
// tepi yang tidak terduga) sengaja TIDAK menggagalkan aksi utama (assign
// Task / kirim komentar) - makanya error dari insert ini tidak dicek/redirect
// seperti mutasi utama lain di modul PM.

// Task multi-assignee - dipanggil dengan daftar user_id yang BARU
// ditambahkan sebagai assignee (bukan seluruh assignee saat ini), supaya
// orang yang sudah lama jadi assignee tidak dapat notifikasi ulang tiap
// Task diedit.
export async function notifyTaskAssigned(
  supabase: SupabaseServerClient,
  params: { assigneeIds: string[]; actorId: string; taskId: string; judul: string },
) {
  const { assigneeIds, actorId, taskId, judul } = params;
  const targets = assigneeIds.filter((id) => id !== actorId);
  if (targets.length === 0) return;

  await supabase.from("pm_notifications").insert(
    targets.map((userId) => ({
      user_id: userId,
      type: "task_assigned" as const,
      task_id: taskId,
      pesan: `Anda ditugaskan ke Task "${judul}".`,
    })),
  );
}

export async function notifyTaskCommented(
  supabase: SupabaseServerClient,
  params: { assigneeIds: string[]; actorId: string; taskId: string; judul: string },
) {
  const { assigneeIds, actorId, taskId, judul } = params;
  const targets = assigneeIds.filter((id) => id !== actorId);
  if (targets.length === 0) return;

  await supabase.from("pm_notifications").insert(
    targets.map((userId) => ({
      user_id: userId,
      type: "task_commented" as const,
      task_id: taskId,
      pesan: `Ada komentar baru di Task "${judul}".`,
    })),
  );
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
