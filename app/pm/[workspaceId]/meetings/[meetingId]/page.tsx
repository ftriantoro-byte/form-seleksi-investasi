import { createClient } from "@/lib/supabase/server";
import { deleteMeeting, createActionItem } from "@/actions/pm/meetings";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { FormField } from "@/components/ui/FormField";
import { PmCollaborativeDoc } from "@/components/pm/PmCollaborativeDoc";
import { PmRealtimeRefresher } from "@/components/pm/PmRealtimeRefresher";
import { PmActionItemList } from "@/components/pm/PmActionItemList";

type PmMeeting = {
  id: string;
  judul: string;
  meeting_date: string | null;
  crdt_state: string | null;
};

type PmActionItem = {
  id: string;
  deskripsi: string;
  assignee_id: string | null;
  due_date: string | null;
  task_id: string | null;
};

type PmWorkspaceMemberProfile = { user_id: string; email: string };
type PmListOption = { id: string; nama: string; space_id: string };
type PmSpace = { id: string; nama: string };

export default async function MeetingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; meetingId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspaceId, meetingId } = await params;
  const { error } = await searchParams;

  // Akses modul PM sudah dicek di app/pm/layout.tsx.
  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("pm_meetings")
    .select("id, judul, meeting_date, crdt_state")
    .eq("id", meetingId)
    .single<PmMeeting>();

  if (!meeting) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Meeting tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  // Space+List digabung lewat nested select (dulu 2 round-trip berurutan),
  // dan Task terkait tiap Action Item ikut di-embed langsung di query Action
  // Item itu sendiri (dulu round-trip terpisah SETELAH actionItems selesai,
  // menunggu task_id-nya dulu) - jadi semua 4 query di sini independen &
  // bisa jalan paralel.
  const [
    { data: attendeeIdsRaw },
    { data: actionItemsRaw },
    { data: anggotaRaw },
    { data: spacesRaw },
  ] = await Promise.all([
    supabase.from("pm_meeting_attendees").select("user_id").eq("meeting_id", meetingId),
    supabase
      .from("pm_meeting_action_items")
      .select("id, deskripsi, assignee_id, due_date, task_id, pm_tasks(id, judul, list_id)")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true }),
    supabase.rpc("pm_workspace_member_profiles", { p_workspace_id: workspaceId }),
    supabase
      .from("pm_spaces")
      .select("id, nama, pm_lists(id, nama, space_id)")
      .eq("workspace_id", workspaceId),
  ]);

  const anggota = (anggotaRaw ?? []) as PmWorkspaceMemberProfile[];
  const emailByUserId = new Map(anggota.map((a) => [a.user_id, a.email]));
  const attendeeIds = new Set((attendeeIdsRaw ?? []).map((a) => a.user_id as string));
  const attendees = anggota.filter((a) => attendeeIds.has(a.user_id));
  const actionItemsWithTask = (actionItemsRaw ?? []) as unknown as (PmActionItem & {
    pm_tasks: { id: string; judul: string; list_id: string } | null;
  })[];
  const actionItems: PmActionItem[] = actionItemsWithTask;
  const spaces = ((spacesRaw ?? []) as unknown as (PmSpace & { pm_lists: PmListOption[] })[]);
  const lists = spaces.flatMap((s) => s.pm_lists);

  const spaceNameById = new Map(spaces.map((s) => [s.id, s.nama]));
  const listOptions = lists.map((l) => ({
    id: l.id,
    label: `${spaceNameById.get(l.space_id) ?? "?"} / ${l.nama}`,
  }));
  const spaceIdByListId = new Map(lists.map((l) => [l.id, l.space_id]));

  const taskInfoByItemId: Record<
    string,
    { taskId: string; spaceId: string; listId: string; judul: string }
  > = {};
  for (const item of actionItemsWithTask) {
    const task = item.pm_tasks;
    const spaceId = task ? spaceIdByListId.get(task.list_id) : undefined;
    if (task && spaceId) {
      taskInfoByItemId[item.id] = { taskId: task.id, spaceId, listId: task.list_id, judul: task.judul };
    }
  }

  return (
    <FormPageShell maxWidth="max-w-3xl">
      <PmRealtimeRefresher
        channelName={`pm-meeting-${meetingId}`}
        subscriptions={[
          { table: "pm_meeting_action_items", filter: `meeting_id=eq.${meetingId}` },
        ]}
      />

      <FormPageHeader
        title={meeting.judul}
        subtitle={meeting.meeting_date ?? undefined}
        backHref={`/pm/${workspaceId}/meetings`}
        backLabel="Kembali ke Riwayat Meeting"
      />

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {attendees.map((a) => (
          <span
            key={a.user_id}
            className="rounded-full bg-zinc-100 px-3 py-1 text-[12px] text-zinc-600"
          >
            {a.email}
          </span>
        ))}
        {attendees.length === 0 && (
          <span className="text-[13px] text-zinc-400">Belum ada peserta tercatat.</span>
        )}
      </div>

      <div className="rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Notulensi</h3>
        <p className="mt-1 text-[13px] text-zinc-400">
          Kolaboratif real-time - semua peserta bisa mengetik bersamaan.
        </p>
        <div className="mt-4">
          <PmCollaborativeDoc docId={meeting.id} initialStateHex={meeting.crdt_state} kind="meeting" />
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Action Item</h3>
        <p className="mt-1 text-[13px] text-zinc-400">
          Baris terstruktur terpisah dari notulensi - bisa langsung dijadikan Task.
        </p>

        <PmActionItemList
          items={actionItems}
          emailByUserId={Object.fromEntries(emailByUserId)}
          listOptions={listOptions}
          taskInfoByItemId={taskInfoByItemId}
          workspaceId={workspaceId}
        />

        <form
          action={createActionItem}
          className="mt-5 grid grid-cols-1 gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-3"
        >
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="meetingId" value={meetingId} />
          <div className="sm:col-span-3">
            <FormField label="Deskripsi" name="deskripsi" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-zinc-500">
              PIC (opsional)
            </label>
            <select
              name="assigneeId"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">- Belum ditentukan -</option>
              {anggota.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-zinc-500">
              Tenggat (opsional)
            </label>
            <input
              type="date"
              name="dueDate"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-fit rounded-full bg-zinc-100 px-5 py-2.5 text-[14px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
            >
              Tambah Action Item
            </button>
          </div>
        </form>
      </div>

      <form action={deleteMeeting} className="mt-8">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="meetingId" value={meetingId} />
        <button
          type="submit"
          className="text-[13px] font-medium text-red-500 transition-colors hover:text-red-700"
        >
          Hapus Meeting ini
        </button>
      </form>
    </FormPageShell>
  );
}
