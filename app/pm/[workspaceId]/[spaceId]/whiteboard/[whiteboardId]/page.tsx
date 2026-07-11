import { createClient } from "@/lib/supabase/server";
import { deleteWhiteboard } from "@/actions/pm/whiteboards";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { PmWhiteboardCanvas } from "@/components/pm/PmWhiteboardCanvas";
import { PmRealtimeRefresher } from "@/components/pm/PmRealtimeRefresher";

type PmWhiteboardItemRow = {
  id: string;
  konten: string;
  warna: string;
  pos_x: number;
  pos_y: number;
  task_id: string | null;
};

type PmTaskRow = { id: string; judul: string; list_id: string };
type PmListOption = { id: string; nama: string };

export default async function WhiteboardPage({
  params,
}: {
  params: Promise<{ workspaceId: string; spaceId: string; whiteboardId: string }>;
}) {
  const { workspaceId, spaceId, whiteboardId } = await params;

  // Akses modul PM sudah dicek di app/pm/layout.tsx.
  const supabase = await createClient();

  const { data: whiteboard } = await supabase
    .from("pm_whiteboards")
    .select("id, nama, space_id")
    .eq("id", whiteboardId)
    .single();

  if (!whiteboard || whiteboard.space_id !== spaceId) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Whiteboard tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  const [{ data: itemsRaw }, { data: listsRaw }] = await Promise.all([
    supabase
      .from("pm_whiteboard_items")
      .select("id, konten, warna, pos_x, pos_y, task_id")
      .eq("whiteboard_id", whiteboardId)
      .order("created_at", { ascending: true }),
    supabase.from("pm_lists").select("id, nama").eq("space_id", spaceId),
  ]);

  const items = (itemsRaw ?? []) as PmWhiteboardItemRow[];
  const lists = (listsRaw ?? []) as PmListOption[];

  const taskIds = items.map((item) => item.task_id).filter((id): id is string => Boolean(id));
  const taskInfoByItemId: Record<string, { taskId: string; listId: string; judul: string }> = {};

  if (taskIds.length > 0) {
    const { data: tasksRaw } = await supabase
      .from("pm_tasks")
      .select("id, judul, list_id")
      .in("id", taskIds);
    const tasks = (tasksRaw ?? []) as PmTaskRow[];
    const taskById = new Map(tasks.map((t) => [t.id, t]));
    for (const item of items) {
      if (!item.task_id) continue;
      const task = taskById.get(item.task_id);
      if (task) {
        taskInfoByItemId[item.id] = { taskId: task.id, listId: task.list_id, judul: task.judul };
      }
    }
  }

  return (
    <FormPageShell maxWidth="max-w-4xl">
      <PmRealtimeRefresher
        channelName={`pm-whiteboard-${whiteboardId}`}
        subscriptions={[
          { table: "pm_whiteboard_items", filter: `whiteboard_id=eq.${whiteboardId}` },
        ]}
      />

      <FormPageHeader
        title={whiteboard.nama}
        backHref={`/pm/${workspaceId}/${spaceId}`}
        backLabel="Kembali ke Space"
      />

      <PmWhiteboardCanvas
        whiteboardId={whiteboardId}
        items={items}
        taskInfoByItemId={taskInfoByItemId}
        lists={lists}
        workspaceId={workspaceId}
        spaceId={spaceId}
      />

      <form action={deleteWhiteboard} className="mt-6">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="spaceId" value={spaceId} />
        <input type="hidden" name="whiteboardId" value={whiteboardId} />
        <button
          type="submit"
          className="text-[13px] font-medium text-red-500 transition-colors hover:text-red-700"
        >
          Hapus Whiteboard ini
        </button>
      </form>
    </FormPageShell>
  );
}
