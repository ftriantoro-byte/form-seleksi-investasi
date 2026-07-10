import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead, markAllNotificationsRead } from "@/actions/pm/notifications";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";

type PmNotificationRow = {
  id: string;
  pesan: string;
  dibaca: boolean;
  created_at: string;
  task_id: string | null;
  pm_tasks: {
    list_id: string;
    pm_lists: {
      space_id: string;
      pm_spaces: { workspace_id: string } | null;
    } | null;
  } | null;
};

export default async function PmNotificationsPage() {
  // Akses modul PM sudah dicek di app/pm/layout.tsx.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">Anda belum login.</p>
      </FormPageShell>
    );
  }

  const { data: notificationsRaw } = await supabase
    .from("pm_notifications")
    .select(
      "id, pesan, dibaca, created_at, task_id, pm_tasks(list_id, pm_lists(space_id, pm_spaces(workspace_id)))",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (notificationsRaw ?? []) as unknown as PmNotificationRow[];
  const adaBelumDibaca = notifications.some((n) => !n.dibaca);

  return (
    <FormPageShell maxWidth="max-w-2xl">
      <FormPageHeader title="Notifikasi" backHref="/pm" backLabel="Kembali" />

      {adaBelumDibaca && (
        <form action={markAllNotificationsRead} className="mb-4">
          <button
            type="submit"
            className="rounded-full bg-zinc-100 px-4 py-1.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
          >
            Tandai semua dibaca
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {notifications.map((n) => {
          const tugas = n.pm_tasks;
          const space = tugas?.pm_lists;
          const workspaceId = space?.pm_spaces?.workspace_id;
          const href =
            n.task_id && tugas && space && workspaceId
              ? `/pm/${workspaceId}/${space.space_id}/${tugas.list_id}/${n.task_id}`
              : null;

          const isi = (
            <>
              <p className={`text-[14px] ${n.dibaca ? "text-zinc-500" : "font-medium text-zinc-900"}`}>
                {n.pesan}
              </p>
              <p className="mt-1 text-[12px] text-zinc-400">
                {new Date(n.created_at).toLocaleString("id-ID")}
              </p>
            </>
          );

          return (
            <li
              key={n.id}
              className={`rounded-2xl border border-black/[0.04] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
                n.dibaca ? "bg-white" : "bg-amber-50/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {href ? (
                    <Link href={href} className="hover:underline">
                      {isi}
                    </Link>
                  ) : (
                    isi
                  )}
                </div>
                {!n.dibaca && (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="notificationId" value={n.id} />
                    <button
                      type="submit"
                      className="whitespace-nowrap text-[12px] text-zinc-400 transition-colors hover:text-zinc-700"
                    >
                      Tandai dibaca
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
        {notifications.length === 0 && (
          <li className="text-[14px] text-zinc-400">Belum ada notifikasi.</li>
        )}
      </ul>
    </FormPageShell>
  );
}
