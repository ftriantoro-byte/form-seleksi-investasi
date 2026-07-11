import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { renameList, deleteList, updateStatusLabels } from "@/actions/pm/lists";
import { createTask } from "@/actions/pm/tasks";
import { createFieldDefinition, deleteFieldDefinition } from "@/actions/pm/customFields";
import { createAutomation, toggleAutomation, deleteAutomation } from "@/actions/pm/automations";
import { saveListAsTemplate } from "@/actions/pm/templates";
import {
  TASK_STATUS_VALUES,
  TASK_PRIORITY_VALUES,
  CUSTOM_FIELD_TYPE_VALUES,
  CUSTOM_FIELD_TYPE_LABEL,
} from "@/lib/pm/schema";
import { TASK_PRIORITY_LABEL } from "@/lib/pm/labels";
import { mergeStatusLabels } from "@/lib/pm/statusLabels";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { PmBoardView } from "@/components/pm/PmBoardView";
import { PmCalendarView } from "@/components/pm/PmCalendarView";
import { PmGanttView } from "@/components/pm/PmGanttView";
import { PmRealtimeRefresher } from "@/components/pm/PmRealtimeRefresher";
import { PmTaskListInline } from "@/components/pm/PmTaskListInline";

type PmWorkspaceMemberProfile = { user_id: string; email: string };
type PmFieldDefinition = {
  id: string;
  nama: string;
  type: string;
  opsi: string[] | null;
};

type PmAutomation = {
  id: string;
  nama: string;
  trigger_status: string;
  condition_priority: string | null;
  action_type: string;
  action_value: string | null;
  aktif: boolean;
};

type PmTaskRow = {
  id: string;
  judul: string;
  status: string;
  priority: string | null;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
};

const VIEW_VALUES = ["list", "board", "calendar", "gantt"] as const;
type PmView = (typeof VIEW_VALUES)[number];

const SORT_VALUES = ["created_at", "judul", "due_date"] as const;
const SORT_LABEL: Record<string, string> = {
  created_at: "Terbaru dibuat",
  judul: "Judul (A-Z)",
  due_date: "Due Date terdekat",
};

export default async function ListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; spaceId: string; listId: string }>;
  searchParams: Promise<{
    error?: string;
    view?: string;
    status?: string;
    assignee?: string;
    priority?: string;
    sort?: string;
    month?: string;
  }>;
}) {
  const { workspaceId, spaceId, listId } = await params;
  const {
    error,
    view: viewParam,
    status: statusFilter,
    assignee: assigneeFilter,
    priority: priorityFilter,
    sort: sortParam,
    month: monthParam,
  } = await searchParams;
  const view: PmView = VIEW_VALUES.includes(viewParam as PmView) ? (viewParam as PmView) : "list";
  const sort = SORT_VALUES.includes(sortParam as (typeof SORT_VALUES)[number])
    ? (sortParam as (typeof SORT_VALUES)[number])
    : "created_at";
  const now = new Date();
  const month =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Akses modul PM sudah dicek di app/pm/layout.tsx.
  const supabase = await createClient();

  const { data: list } = await supabase
    .from("pm_lists")
    .select("id, nama, deskripsi, space_id, folder_id, custom_status_labels")
    .eq("id", listId)
    .single();

  if (!list || list.space_id !== spaceId) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          List tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  const statusLabels = mergeStatusLabels(list.custom_status_labels);

  let taskQuery = supabase
    .from("pm_tasks")
    .select("id, judul, status, priority, assignee_id, start_date, due_date")
    .eq("list_id", listId);

  if (statusFilter) taskQuery = taskQuery.eq("status", statusFilter);
  if (assigneeFilter) taskQuery = taskQuery.eq("assignee_id", assigneeFilter);
  if (priorityFilter) taskQuery = taskQuery.eq("priority", priorityFilter);

  taskQuery = taskQuery.order(sort, { ascending: true, nullsFirst: false });

  const [{ data: tasksRaw }, { data: anggotaRaw }, { data: fieldDefinitionsRaw }, { data: automationsRaw }] =
    await Promise.all([
      taskQuery,
      supabase.rpc("pm_workspace_member_profiles", { p_workspace_id: workspaceId }),
      supabase
        .from("pm_custom_field_definitions")
        .select("id, nama, type, opsi")
        .eq("list_id", listId)
        .order("urutan", { ascending: true }),
      supabase
        .from("pm_automations")
        .select("id, nama, trigger_status, condition_priority, action_type, action_value, aktif")
        .eq("list_id", listId)
        .order("created_at", { ascending: true }),
    ]);

  const tasks = (tasksRaw ?? []) as PmTaskRow[];
  const anggota = (anggotaRaw ?? []) as PmWorkspaceMemberProfile[];
  const emailByUserId = new Map(anggota.map((a) => [a.user_id, a.email]));
  const emailByUserIdRecord = Object.fromEntries(emailByUserId);
  const fieldDefinitions = (fieldDefinitionsRaw ?? []) as PmFieldDefinition[];
  const automations = (automationsRaw ?? []) as PmAutomation[];

  const listBase = `/pm/${workspaceId}/${spaceId}/${listId}`;
  const parentPath = list.folder_id
    ? `/pm/${workspaceId}/${spaceId}/folder/${list.folder_id}`
    : `/pm/${workspaceId}/${spaceId}`;
  const parentLabel = list.folder_id ? "Kembali ke Folder" : "Kembali ke Space";

  return (
    <FormPageShell maxWidth="max-w-4xl">
      <PmRealtimeRefresher
        channelName={`pm-list-${listId}`}
        subscriptions={[{ table: "pm_tasks", filter: `list_id=eq.${listId}` }]}
      />
      <FormPageHeader
        title={list.nama}
        subtitle={list.deskripsi ?? undefined}
        backHref={parentPath}
        backLabel={parentLabel}
      />

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-200">
              ⚙ Status
            </summary>
            <div className="absolute left-0 top-full z-20 mt-2 w-80 max-w-[90vw] rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl">
              <p className="text-[12px] text-zinc-400">
                Ganti label tampilan 4 status baku (kosongkan untuk pakai label default).
              </p>
              <form action={updateStatusLabels} className="mt-3 grid grid-cols-1 gap-2.5">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <input type="hidden" name="spaceId" value={spaceId} />
                <input type="hidden" name="listId" value={listId} />
                {TASK_STATUS_VALUES.map((value) => (
                  <div key={value}>
                    <label className="block text-[11px] font-medium text-zinc-500">
                      Label untuk &quot;{statusLabels[value]}&quot;
                    </label>
                    <input
                      name={`label_${value}`}
                      defaultValue={list.custom_status_labels?.[value] ?? ""}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  className="mt-1 w-fit rounded-full bg-zinc-900 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-zinc-700"
                >
                  Simpan Label Status
                </button>
              </form>

              <p className="mt-4 border-t border-zinc-100 pt-3 text-[12px] font-medium text-zinc-500">
                Custom Field
              </p>
              <ul className="mt-2 space-y-1">
                {fieldDefinitions.map((def) => (
                  <li
                    key={def.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-[12px] text-zinc-700"
                  >
                    <span className="truncate">
                      {def.nama}{" "}
                      <span className="text-zinc-400">
                        (
                        {CUSTOM_FIELD_TYPE_LABEL[
                          def.type as (typeof CUSTOM_FIELD_TYPE_VALUES)[number]
                        ] ?? def.type}
                        )
                      </span>
                    </span>
                    <form action={deleteFieldDefinition}>
                      <input type="hidden" name="workspaceId" value={workspaceId} />
                      <input type="hidden" name="spaceId" value={spaceId} />
                      <input type="hidden" name="listId" value={listId} />
                      <input type="hidden" name="fieldDefinitionId" value={def.id} />
                      <button
                        type="submit"
                        className="shrink-0 text-[11px] text-zinc-400 hover:text-red-600"
                      >
                        Hapus
                      </button>
                    </form>
                  </li>
                ))}
                {fieldDefinitions.length === 0 && (
                  <li className="text-[12px] text-zinc-400">Belum ada Custom Field.</li>
                )}
              </ul>
              <form action={createFieldDefinition} className="mt-2 grid grid-cols-1 gap-2">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <input type="hidden" name="spaceId" value={spaceId} />
                <input type="hidden" name="listId" value={listId} />
                <input
                  name="nama"
                  placeholder="Nama Field"
                  required
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                />
                <select
                  name="type"
                  defaultValue="text"
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                >
                  {CUSTOM_FIELD_TYPE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {CUSTOM_FIELD_TYPE_LABEL[value]}
                    </option>
                  ))}
                </select>
                <input
                  name="opsi"
                  placeholder="Opsi (pisah koma, khusus Pilihan)"
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                />
                <button
                  type="submit"
                  className="w-fit rounded-full bg-zinc-100 px-4 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200"
                >
                  Tambah Custom Field
                </button>
              </form>
            </div>
          </details>

          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-200">
              ⚡ Automasi
            </summary>
            <div className="absolute left-0 top-full z-20 mt-2 w-96 max-w-[90vw] rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl">
              <p className="text-[12px] text-zinc-400">
                Saat Task pindah ke status tertentu (dengan syarat priority opsional), lakukan aksi
                otomatis.
              </p>
              <ul className="mt-3 space-y-2">
                {automations.map((auto) => (
                  <li
                    key={auto.id}
                    className={`rounded-lg px-2.5 py-2 text-[12px] ${auto.aktif ? "bg-zinc-50" : "bg-zinc-50/50 text-zinc-400"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-zinc-800">{auto.nama}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <form action={toggleAutomation}>
                          <input type="hidden" name="workspaceId" value={workspaceId} />
                          <input type="hidden" name="spaceId" value={spaceId} />
                          <input type="hidden" name="listId" value={listId} />
                          <input type="hidden" name="automationId" value={auto.id} />
                          <button type="submit" className="text-zinc-400 hover:text-zinc-700">
                            {auto.aktif ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </form>
                        <form action={deleteAutomation}>
                          <input type="hidden" name="workspaceId" value={workspaceId} />
                          <input type="hidden" name="spaceId" value={spaceId} />
                          <input type="hidden" name="listId" value={listId} />
                          <input type="hidden" name="automationId" value={auto.id} />
                          <button type="submit" className="text-zinc-400 hover:text-red-600">
                            Hapus
                          </button>
                        </form>
                      </div>
                    </div>
                    <p className="mt-1 text-zinc-500">
                      Saat status → <strong>{statusLabels[auto.trigger_status]}</strong>
                      {auto.condition_priority && (
                        <>
                          {" "}
                          dan priority = <strong>{TASK_PRIORITY_LABEL[auto.condition_priority]}</strong>
                        </>
                      )}
                      {" → "}
                      {auto.action_type === "set_status" &&
                        `ubah status ke ${statusLabels[auto.action_value ?? ""] ?? auto.action_value}`}
                      {auto.action_type === "set_assignee" &&
                        `assign ke ${auto.action_value ? (emailByUserId.get(auto.action_value) ?? auto.action_value) : "kosongkan assignee"}`}
                      {auto.action_type === "set_priority" &&
                        `set priority ke ${auto.action_value ? TASK_PRIORITY_LABEL[auto.action_value] : "kosong"}`}
                    </p>
                  </li>
                ))}
                {automations.length === 0 && (
                  <li className="text-[12px] text-zinc-400">Belum ada Automasi.</li>
                )}
              </ul>

              <form action={createAutomation} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <input type="hidden" name="spaceId" value={spaceId} />
                <input type="hidden" name="listId" value={listId} />
                <input
                  name="nama"
                  placeholder="Nama Automasi"
                  required
                  className="sm:col-span-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                />
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500">
                    Trigger: status jadi
                  </label>
                  <select
                    name="triggerStatus"
                    defaultValue="to_do"
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                  >
                    {TASK_STATUS_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {statusLabels[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500">
                    Condition: priority
                  </label>
                  <select
                    name="conditionPriority"
                    defaultValue=""
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                  >
                    <option value="">- Tanpa syarat -</option>
                    {TASK_PRIORITY_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {TASK_PRIORITY_LABEL[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-zinc-500">Action</label>
                  <select
                    name="actionType"
                    defaultValue="set_status"
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                  >
                    <option value="set_status">Ubah status ke...</option>
                    <option value="set_assignee">Assign ke...</option>
                    <option value="set_priority">Set priority ke...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500">
                    Nilai &quot;Ubah status&quot;
                  </label>
                  <select
                    name="actionStatusValue"
                    defaultValue="to_do"
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                  >
                    {TASK_STATUS_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {statusLabels[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500">
                    Nilai &quot;Assign&quot;
                  </label>
                  <select
                    name="actionAssigneeValue"
                    defaultValue=""
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                  >
                    <option value="">- Kosongkan -</option>
                    {anggota.map((a) => (
                      <option key={a.user_id} value={a.user_id}>
                        {a.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-zinc-500">
                    Nilai &quot;Set priority&quot;
                  </label>
                  <select
                    name="actionPriorityValue"
                    defaultValue=""
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                  >
                    <option value="">- Tidak ada -</option>
                    {TASK_PRIORITY_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {TASK_PRIORITY_LABEL[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-fit rounded-full bg-zinc-100 px-4 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200"
                  >
                    Tambah Automasi
                  </button>
                </div>
              </form>
            </div>
          </details>

          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-200">
              💾 Simpan sbg Template
            </summary>
            <div className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[90vw] rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl">
              <p className="text-[12px] text-zinc-400">
                Simpan label status &amp; Custom Field List ini supaya bisa dipakai ulang.
              </p>
              <form action={saveListAsTemplate} className="mt-2 flex flex-col gap-2">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <input type="hidden" name="spaceId" value={spaceId} />
                <input type="hidden" name="listId" value={listId} />
                <input
                  name="nama"
                  defaultValue={list.nama}
                  required
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                />
                <button
                  type="submit"
                  className="w-fit rounded-full bg-zinc-100 px-4 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200"
                >
                  Simpan sebagai Template
                </button>
              </form>
            </div>
          </details>

          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-200">
              ⚙️ Pengaturan
            </summary>
            <div className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[90vw] rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl">
              <form action={renameList} className="grid grid-cols-1 gap-2">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <input type="hidden" name="spaceId" value={spaceId} />
                <input type="hidden" name="listId" value={listId} />
                {list.folder_id && <input type="hidden" name="folderId" value={list.folder_id} />}
                <label className="block text-[11px] font-medium text-zinc-500">Nama List</label>
                <input
                  name="nama"
                  defaultValue={list.nama}
                  required
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                />
                <label className="block text-[11px] font-medium text-zinc-500">
                  Deskripsi (opsional)
                </label>
                <textarea
                  name="deskripsi"
                  rows={2}
                  defaultValue={list.deskripsi ?? ""}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                />
                <button
                  type="submit"
                  className="w-fit rounded-full bg-zinc-100 px-4 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200"
                >
                  Simpan Perubahan
                </button>
              </form>
              <form action={deleteList} className="mt-2 border-t border-zinc-100 pt-2">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <input type="hidden" name="spaceId" value={spaceId} />
                <input type="hidden" name="listId" value={listId} />
                {list.folder_id && <input type="hidden" name="folderId" value={list.folder_id} />}
                <button
                  type="submit"
                  className="text-[12px] font-medium text-red-500 hover:text-red-700"
                >
                  Hapus List ini
                </button>
              </form>
            </div>
          </details>
        </div>

        <div className="inline-flex rounded-full bg-zinc-100 p-1">
          <Link
            href={{ pathname: listBase, query: { view: "list" } }}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              view === "list" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            List
          </Link>
          <Link
            href={{ pathname: listBase, query: { view: "board" } }}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              view === "board" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            Board
          </Link>
          <Link
            href={{ pathname: listBase, query: { view: "calendar", month } }}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              view === "calendar" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            Calendar
          </Link>
          <Link
            href={{ pathname: listBase, query: { view: "gantt" } }}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              view === "gantt" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            Gantt
          </Link>
        </div>
      </div>

      <form className="mt-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="view" value={view} />
        {view === "calendar" && <input type="hidden" name="month" value={month} />}
        <select
          name="status"
          defaultValue={statusFilter ?? ""}
          className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-[13px] text-zinc-700 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="">Semua status</option>
          {TASK_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </select>
        <select
          name="assignee"
          defaultValue={assigneeFilter ?? ""}
          className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-[13px] text-zinc-700 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="">Semua assignee</option>
          {anggota.map((a) => (
            <option key={a.user_id} value={a.user_id}>
              {a.email}
            </option>
          ))}
        </select>
        <select
          name="priority"
          defaultValue={priorityFilter ?? ""}
          className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-[13px] text-zinc-700 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="">Semua priority</option>
          {TASK_PRIORITY_VALUES.map((value) => (
            <option key={value} value={value}>
              {TASK_PRIORITY_LABEL[value]}
            </option>
          ))}
        </select>
        {view === "list" && (
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-[13px] text-zinc-700 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
          >
            {SORT_VALUES.map((value) => (
              <option key={value} value={value}>
                {SORT_LABEL[value]}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="rounded-full bg-zinc-900 px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Terapkan
        </button>
        <Link
          href={{ pathname: listBase, query: view === "calendar" ? { view, month } : { view } }}
          className="text-[13px] text-zinc-400 transition-colors hover:text-zinc-700"
        >
          Reset filter
        </Link>
      </form>

      <div className="mt-4">
        {view === "board" ? (
          <PmBoardView
            tasks={tasks}
            emailByUserId={emailByUserIdRecord}
            listBase={listBase}
            statusLabels={statusLabels}
          />
        ) : view === "calendar" ? (
          <PmCalendarView
            tasks={tasks}
            listBase={listBase}
            month={month}
            baseQuery={{
              ...(statusFilter ? { status: statusFilter } : {}),
              ...(assigneeFilter ? { assignee: assigneeFilter } : {}),
              ...(priorityFilter ? { priority: priorityFilter } : {}),
            }}
          />
        ) : view === "gantt" ? (
          <PmGanttView tasks={tasks} listBase={listBase} />
        ) : (
          <>
            <form action={createTask} className="mb-3 flex items-center gap-2">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="spaceId" value={spaceId} />
              <input type="hidden" name="listId" value={listId} />
              <input type="hidden" name="status" value="to_do" />
              <input
                name="judul"
                required
                placeholder="Tambah task baru..."
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[14px] text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
              />
              <button
                type="submit"
                className="rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Tambah
              </button>
            </form>
            <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-zinc-100 text-zinc-400">
                      <th className="px-4 py-2 font-medium">Task</th>
                      <th className="px-2 py-2 font-medium">Assignee</th>
                      <th className="px-2 py-2 font-medium">Due Date</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium">Priority</th>
                    </tr>
                  </thead>
                  <PmTaskListInline
                    tasks={tasks}
                    emailByUserId={emailByUserIdRecord}
                    listBase={listBase}
                    statusLabels={statusLabels}
                  />
                </table>
              </div>
            </div>
          </>
        )}
      </div>

    </FormPageShell>
  );
}
