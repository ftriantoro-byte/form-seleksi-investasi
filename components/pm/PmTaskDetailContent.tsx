import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateTask, deleteTask, createSubtask } from "@/actions/pm/tasks";
import { createComment, deleteComment } from "@/actions/pm/comments";
import { addDependency, removeDependency } from "@/actions/pm/dependencies";
import {
  createChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/actions/pm/checklist";
import { createTimeEntry, deleteTimeEntry } from "@/actions/pm/timeEntries";
import { uploadAttachment, downloadAttachment, deleteAttachment } from "@/actions/pm/attachments";
import { TASK_STATUS_VALUES, TASK_PRIORITY_VALUES } from "@/lib/pm/schema";
import { TASK_PRIORITY_LABEL } from "@/lib/pm/labels";
import { mergeStatusLabels } from "@/lib/pm/statusLabels";
import { FormField } from "@/components/ui/FormField";
import { PmRealtimeRefresher } from "@/components/pm/PmRealtimeRefresher";
import { PmCollaborativeDoc } from "@/components/pm/PmCollaborativeDoc";
import { renderMentionText } from "@/lib/pm/mentions";

type PmWorkspaceMemberProfile = { user_id: string; email: string };

type PmTaskDetail = {
  id: string;
  list_id: string;
  judul: string;
  deskripsi: string | null;
  status: string;
  priority: string | null;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  parent_task_id: string | null;
};

type PmChecklistItemRow = {
  id: string;
  konten: string;
  selesai: boolean;
};

type PmCommentRow = {
  id: string;
  konten: string;
  created_by: string;
  created_at: string;
};

type PmSubtaskRow = {
  id: string;
  judul: string;
  status: string;
};

type PmOtherTaskRow = { id: string; judul: string };
type PmDependencyRow = { id: string; depends_on_task_id: string };
type PmDependentRow = { id: string; task_id: string };
type PmFieldDefinition = { id: string; nama: string; type: string; opsi: string[] | null };
type PmFieldValueRow = { field_definition_id: string; value: string | null };
type PmTimeEntryRow = {
  id: string;
  user_id: string;
  menit: number;
  catatan: string | null;
  tanggal: string;
};
type PmAttachmentRow = {
  id: string;
  file_name: string;
  size_bytes: number;
  created_by: string;
};

// Dipakai dari dua tempat: halaman penuh [taskId]/page.tsx (navigasi
// langsung/refresh/link) dan modal @modal/(.)[taskId]/page.tsx (dibuka dari
// List/Board lewat navigasi klien - lihat catatan intercepting routes di
// PROGRESS.md tahap A.6). Komponen ini sendiri yang fetch data & handle
// "tidak ditemukan" supaya kedua pemanggil tidak perlu duplikasi logika,
// cuma beda bungkus (FormPageShell vs Modal overlay).
export async function PmTaskDetailContent({
  workspaceId,
  spaceId,
  listId,
  taskId,
  error,
}: {
  workspaceId: string;
  spaceId: string;
  listId: string;
  taskId: string;
  error?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: taskRaw } = await supabase
    .from("pm_tasks")
    .select(
      "id, list_id, judul, deskripsi, status, priority, assignee_id, start_date, due_date, parent_task_id",
    )
    .eq("id", taskId)
    .single();

  const task = taskRaw as PmTaskDetail | null;

  if (!task || task.list_id !== listId) {
    return (
      <p className="text-[15px] text-zinc-500">
        Task tidak ditemukan (atau Anda tidak berwenang melihatnya).
      </p>
    );
  }

  const [
    { data: anggotaRaw },
    { data: checklistRaw },
    { data: commentsRaw },
    { data: subtasksRaw },
    { data: parentRaw },
    { data: otherTasksRaw },
    { data: dependenciesRaw },
    { data: dependentsRaw },
    { data: listRaw },
    { data: fieldDefinitionsRaw },
    { data: fieldValuesRaw },
    { data: timeEntriesRaw },
    { data: attachmentsRaw },
  ] = await Promise.all([
    supabase.rpc("pm_workspace_member_profiles", { p_workspace_id: workspaceId }),
    supabase
      .from("pm_checklist_items")
      .select("id, konten, selesai")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true }),
    supabase
      .from("pm_comments")
      .select("id, konten, created_by, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true }),
    supabase
      .from("pm_tasks")
      .select("id, judul, status")
      .eq("parent_task_id", taskId)
      .order("created_at", { ascending: true }),
    task.parent_task_id
      ? supabase.from("pm_tasks").select("id, judul").eq("id", task.parent_task_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("pm_tasks")
      .select("id, judul")
      .eq("list_id", listId)
      .neq("id", taskId)
      .order("judul", { ascending: true }),
    supabase.from("pm_task_dependencies").select("id, depends_on_task_id").eq("task_id", taskId),
    supabase.from("pm_task_dependencies").select("id, task_id").eq("depends_on_task_id", taskId),
    supabase.from("pm_lists").select("custom_status_labels").eq("id", listId).single(),
    supabase
      .from("pm_custom_field_definitions")
      .select("id, nama, type, opsi")
      .eq("list_id", listId)
      .order("urutan", { ascending: true }),
    supabase
      .from("pm_custom_field_values")
      .select("field_definition_id, value")
      .eq("task_id", taskId),
    supabase
      .from("pm_time_entries")
      .select("id, user_id, menit, catatan, tanggal")
      .eq("task_id", taskId)
      .order("tanggal", { ascending: false }),
    supabase
      .from("pm_attachments")
      .select("id, file_name, size_bytes, created_by")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
  ]);

  const anggota = (anggotaRaw ?? []) as PmWorkspaceMemberProfile[];
  const emailByUserId = new Map(anggota.map((a) => [a.user_id, a.email]));
  const checklist = (checklistRaw ?? []) as PmChecklistItemRow[];
  const comments = (commentsRaw ?? []) as PmCommentRow[];
  const subtasks = (subtasksRaw ?? []) as PmSubtaskRow[];
  const parentTask = parentRaw as { id: string; judul: string } | null;
  const otherTasks = (otherTasksRaw ?? []) as PmOtherTaskRow[];
  const judulByTaskId = new Map(otherTasks.map((t) => [t.id, t.judul]));
  const dependencies = (dependenciesRaw ?? []) as PmDependencyRow[];
  const dependents = (dependentsRaw ?? []) as PmDependentRow[];
  const dependencyCandidates = otherTasks.filter(
    (t) => !dependencies.some((d) => d.depends_on_task_id === t.id),
  );
  const statusLabels = mergeStatusLabels(
    (listRaw as { custom_status_labels: Record<string, string> | null } | null)
      ?.custom_status_labels,
  );
  const fieldDefinitions = (fieldDefinitionsRaw ?? []) as PmFieldDefinition[];
  const fieldValueByDefId = new Map(
    ((fieldValuesRaw ?? []) as PmFieldValueRow[]).map((v) => [v.field_definition_id, v.value]),
  );
  const timeEntries = (timeEntriesRaw ?? []) as PmTimeEntryRow[];
  const totalMenit = timeEntries.reduce((sum, entry) => sum + entry.menit, 0);
  const formatMenit = (menit: number) =>
    menit >= 60 ? `${Math.floor(menit / 60)}j ${menit % 60}m` : `${menit}m`;
  const attachments = (attachmentsRaw ?? []) as PmAttachmentRow[];
  const formatUkuran = (bytes: number) =>
    bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;

  // Doc kolaboratif 1:1 per Task, dibuat lazy saat pertama kali dibuka
  // (bukan trigger DB - supaya tidak semua Task otomatis punya baris Doc
  // yang tidak pernah dipakai). task_id unique di pm_docs, jadi race antar
  // 2 client yang sama-sama pertama kali buka ditangani dengan re-select
  // kalau insert gagal.
  let doc: { id: string; crdt_state: string | null } | null = null;
  const { data: existingDoc } = await supabase
    .from("pm_docs")
    .select("id, crdt_state")
    .eq("task_id", taskId)
    .maybeSingle();
  doc = existingDoc;
  if (!doc && user) {
    const { data: insertedDoc } = await supabase
      .from("pm_docs")
      .insert({ task_id: taskId, created_by: user.id })
      .select("id, crdt_state")
      .single();
    if (insertedDoc) {
      doc = insertedDoc;
    } else {
      const { data: retryDoc } = await supabase
        .from("pm_docs")
        .select("id, crdt_state")
        .eq("task_id", taskId)
        .maybeSingle();
      doc = retryDoc;
    }
  }

  const hiddenFields = (
    <>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="listId" value={listId} />
      <input type="hidden" name="taskId" value={taskId} />
    </>
  );

  const listBase = `/pm/${workspaceId}/${spaceId}/${listId}`;

  const sectionCls = "mt-5 border-t border-zinc-100 pt-5";
  const headingCls = "text-[13px] font-semibold text-zinc-900";
  const compactInputCls =
    "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10";
  const compactLabelCls = "block text-[11px] font-medium text-zinc-500";

  return (
    <>
      <PmRealtimeRefresher
        channelName={`pm-task-${taskId}`}
        subscriptions={[
          { table: "pm_tasks", filter: `id=eq.${taskId}` },
          { table: "pm_comments", filter: `task_id=eq.${taskId}` },
          { table: "pm_checklist_items", filter: `task_id=eq.${taskId}` },
        ]}
      />
      {parentTask && (
        <p className="mb-2 text-[13px] text-zinc-400">
          Subtask dari{" "}
          <Link href={`${listBase}/${parentTask.id}`} className="text-zinc-600 hover:underline">
            {parentTask.judul}
          </Link>
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>
      )}

      <div className="rounded-2xl border border-zinc-100 bg-white p-5 sm:p-6">
        {/* Detail Task */}
        <form action={updateTask} className="grid grid-cols-1 gap-3">
          {hiddenFields}

          <FormField label="Judul Task" name="judul" defaultValue={task.judul} />

          <div>
            <label className={compactLabelCls}>Deskripsi (opsional)</label>
            <textarea
              name="deskripsi"
              rows={2}
              defaultValue={task.deskripsi ?? ""}
              className={compactInputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className={compactLabelCls}>Status</label>
              <select name="status" defaultValue={task.status} className={compactInputCls}>
                {TASK_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {statusLabels[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={compactLabelCls}>Priority</label>
              <select name="priority" defaultValue={task.priority ?? ""} className={compactInputCls}>
                <option value="">- Tidak ada -</option>
                {TASK_PRIORITY_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {TASK_PRIORITY_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={compactLabelCls}>Start Date</label>
              <input
                type="date"
                name="startDate"
                defaultValue={task.start_date ?? ""}
                className={compactInputCls}
              />
            </div>
            <div>
              <label className={compactLabelCls}>Due Date</label>
              <input
                type="date"
                name="dueDate"
                defaultValue={task.due_date ?? ""}
                className={compactInputCls}
              />
            </div>
          </div>

          <div className="sm:w-1/2">
            <label className={compactLabelCls}>Assignee</label>
            <select name="assigneeId" defaultValue={task.assignee_id ?? ""} className={compactInputCls}>
              <option value="">- Belum ditentukan -</option>
              {anggota.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.email}
                </option>
              ))}
            </select>
          </div>

          {fieldDefinitions.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fieldDefinitions.map((def) => {
                const currentValue = fieldValueByDefId.get(def.id) ?? "";
                const fieldName = `customField_${def.id}`;
                return (
                  <div key={def.id}>
                    <label className={compactLabelCls}>{def.nama}</label>
                    {def.type === "checkbox" ? (
                      <div className="mt-1.5">
                        <input type="hidden" name={fieldName} value="off" />
                        <input
                          type="checkbox"
                          name={fieldName}
                          defaultChecked={currentValue === "true"}
                          className="h-4 w-4 rounded border-zinc-300"
                        />
                      </div>
                    ) : def.type === "select" ? (
                      <select name={fieldName} defaultValue={currentValue} className={compactInputCls}>
                        <option value="">- Belum dipilih -</option>
                        {(def.opsi ?? []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"}
                        name={fieldName}
                        defaultValue={currentValue}
                        className={compactInputCls}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="w-fit rounded-full bg-zinc-900 px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>

        <form action={deleteTask} className="mt-2">
          {hiddenFields}
          <button
            type="submit"
            className="text-[12px] font-medium text-red-500 transition-colors hover:text-red-700"
          >
            Hapus Task ini
          </button>
        </form>

        {/* Docs */}
        <div className={sectionCls}>
          <h3 className={headingCls}>Docs</h3>
          <div className="mt-2">
            {doc ? (
              <PmCollaborativeDoc docId={doc.id} initialStateHex={doc.crdt_state} />
            ) : (
              <p className="text-[13px] text-zinc-400">Doc belum bisa dimuat.</p>
            )}
          </div>
        </div>

        {/* Checklist */}
        <div className={sectionCls}>
          <h3 className={headingCls}>Checklist</h3>
          <ul className="mt-2 space-y-1">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-zinc-50">
                <form action={toggleChecklistItem}>
                  {hiddenFields}
                  <input type="hidden" name="itemId" value={item.id} />
                  <button
                    type="submit"
                    aria-label={item.selesai ? "Tandai belum selesai" : "Tandai selesai"}
                    className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors ${
                      item.selesai
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 text-transparent hover:border-zinc-400"
                    }`}
                  >
                    ✓
                  </button>
                </form>
                <span
                  className={`flex-1 text-[13px] ${
                    item.selesai ? "text-zinc-400 line-through" : "text-zinc-700"
                  }`}
                >
                  {item.konten}
                </span>
                <form action={deleteChecklistItem}>
                  {hiddenFields}
                  <input type="hidden" name="itemId" value={item.id} />
                  <button
                    type="submit"
                    className="text-[11px] text-zinc-300 transition-colors hover:text-red-600"
                  >
                    Hapus
                  </button>
                </form>
              </li>
            ))}
            {checklist.length === 0 && (
              <li className="text-[13px] text-zinc-400">Belum ada item checklist.</li>
            )}
          </ul>

          <form action={createChecklistItem} className="mt-2 flex items-center gap-2">
            {hiddenFields}
            <input
              name="konten"
              placeholder="Tambah item checklist..."
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
            />
            <button
              type="submit"
              className="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
            >
              Tambah
            </button>
          </form>
        </div>

        {/* Waktu Kerja */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between">
            <h3 className={headingCls}>Waktu Kerja</h3>
            {totalMenit > 0 && (
              <span className="text-[12px] font-medium text-zinc-500">
                Total {formatMenit(totalMenit)}
              </span>
            )}
          </div>
          <ul className="mt-2 space-y-1">
            {timeEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <span className="text-[13px] text-zinc-700">
                    {formatMenit(entry.menit)} · {emailByUserId.get(entry.user_id) ?? "Pengguna"} ·{" "}
                    {entry.tanggal}
                  </span>
                  {entry.catatan && (
                    <p className="truncate text-[11px] text-zinc-400">{entry.catatan}</p>
                  )}
                </div>
                {user && entry.user_id === user.id && (
                  <form action={deleteTimeEntry}>
                    {hiddenFields}
                    <input type="hidden" name="entryId" value={entry.id} />
                    <button
                      type="submit"
                      className="shrink-0 text-[11px] text-zinc-300 transition-colors hover:text-red-600"
                    >
                      Hapus
                    </button>
                  </form>
                )}
              </li>
            ))}
            {timeEntries.length === 0 && (
              <li className="text-[13px] text-zinc-400">Belum ada waktu kerja tercatat.</li>
            )}
          </ul>

          <form action={createTimeEntry} className="mt-2 flex flex-wrap items-end gap-2">
            {hiddenFields}
            <div>
              <label className={compactLabelCls}>Menit</label>
              <input
                type="number"
                name="menit"
                min={1}
                required
                className="mt-1 w-20 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className={compactLabelCls}>Tanggal</label>
              <input
                type="date"
                name="tanggal"
                className="mt-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <label className={compactLabelCls}>Catatan (opsional)</label>
              <input
                name="catatan"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
            >
              Catat
            </button>
          </form>
        </div>

        {/* Lampiran */}
        <div className={sectionCls}>
          <h3 className={headingCls}>Lampiran</h3>
          <ul className="mt-2 space-y-1">
            {attachments.map((att) => (
              <li
                key={att.id}
                className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-zinc-700">{att.file_name}</p>
                  <p className="text-[11px] text-zinc-400">
                    {formatUkuran(att.size_bytes)} · {emailByUserId.get(att.created_by) ?? "Pengguna"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <form action={downloadAttachment}>
                    {hiddenFields}
                    <input type="hidden" name="attachmentId" value={att.id} />
                    <button type="submit" className="text-[11px] font-medium text-zinc-600 hover:underline">
                      Unduh
                    </button>
                  </form>
                  <form action={deleteAttachment}>
                    {hiddenFields}
                    <input type="hidden" name="attachmentId" value={att.id} />
                    <button
                      type="submit"
                      className="text-[11px] text-zinc-300 transition-colors hover:text-red-600"
                    >
                      Hapus
                    </button>
                  </form>
                </div>
              </li>
            ))}
            {attachments.length === 0 && (
              <li className="text-[13px] text-zinc-400">Belum ada lampiran.</li>
            )}
          </ul>

          <form action={uploadAttachment} className="mt-2 flex flex-wrap items-center gap-2">
            {hiddenFields}
            <input
              type="file"
              name="file"
              required
              className="flex-1 text-[12px] text-zinc-600 file:mr-2 file:rounded-full file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
            />
            <button
              type="submit"
              className="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
            >
              Unggah
            </button>
          </form>
          <p className="mt-1.5 text-[11px] text-zinc-400">Maksimal 10 MB per file.</p>
        </div>

        {/* Subtask */}
        <div className={sectionCls}>
          <h3 className={headingCls}>Subtask</h3>
          <ul className="mt-2 space-y-1">
            {subtasks.map((sub) => (
              <li key={sub.id} className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 hover:bg-zinc-50">
                <Link href={`${listBase}/${sub.id}`} className="truncate text-[13px] text-zinc-700 hover:underline">
                  {sub.judul}
                </Link>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                  {statusLabels[sub.status] ?? sub.status}
                </span>
              </li>
            ))}
            {subtasks.length === 0 && (
              <li className="text-[13px] text-zinc-400">Belum ada Subtask.</li>
            )}
          </ul>

          <form action={createSubtask} className="mt-2 flex items-center gap-2">
            {hiddenFields}
            <input type="hidden" name="parentTaskId" value={taskId} />
            <input
              name="judul"
              placeholder="Tambah Subtask..."
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
            />
            <button
              type="submit"
              className="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
            >
              Tambah
            </button>
          </form>
        </div>

        {/* Dependency */}
        <div className={sectionCls}>
          <h3 className={headingCls}>Dependency</h3>

          <p className="mt-2 text-[12px] font-medium text-zinc-500">Menunggu Task lain</p>
          <ul className="mt-1 space-y-1">
            {dependencies.map((dep) => (
              <li
                key={dep.id}
                className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 hover:bg-zinc-50"
              >
                <Link
                  href={`${listBase}/${dep.depends_on_task_id}`}
                  className="truncate text-[13px] text-zinc-700 hover:underline"
                >
                  {judulByTaskId.get(dep.depends_on_task_id) ?? "Task"}
                </Link>
                <form action={removeDependency}>
                  {hiddenFields}
                  <input type="hidden" name="dependencyId" value={dep.id} />
                  <button
                    type="submit"
                    className="text-[11px] text-zinc-300 transition-colors hover:text-red-600"
                  >
                    Hapus
                  </button>
                </form>
              </li>
            ))}
            {dependencies.length === 0 && (
              <li className="text-[13px] text-zinc-400">Tidak menunggu Task lain.</li>
            )}
          </ul>

          {dependencyCandidates.length > 0 && (
            <form action={addDependency} className="mt-2 flex items-center gap-2">
              {hiddenFields}
              <select
                name="dependsOnTaskId"
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
              >
                {dependencyCandidates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.judul}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
              >
                Tambah
              </button>
            </form>
          )}

          <p className="mt-3 text-[12px] font-medium text-zinc-500">Diperlukan oleh</p>
          <ul className="mt-1 space-y-1">
            {dependents.map((dep) => (
              <li
                key={dep.id}
                className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 hover:bg-zinc-50"
              >
                <Link
                  href={`${listBase}/${dep.task_id}`}
                  className="truncate text-[13px] text-zinc-700 hover:underline"
                >
                  {judulByTaskId.get(dep.task_id) ?? "Task"}
                </Link>
                <form action={removeDependency}>
                  {hiddenFields}
                  <input type="hidden" name="dependencyId" value={dep.id} />
                  <button
                    type="submit"
                    className="text-[11px] text-zinc-300 transition-colors hover:text-red-600"
                  >
                    Hapus
                  </button>
                </form>
              </li>
            ))}
            {dependents.length === 0 && (
              <li className="text-[13px] text-zinc-400">Tidak ada Task yang menunggu ini.</li>
            )}
          </ul>
        </div>

        {/* Komentar */}
        <div className={sectionCls}>
          <h3 className={headingCls}>Komentar</h3>
          <ul className="mt-2 space-y-2">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-lg bg-zinc-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-zinc-700">
                    {emailByUserId.get(comment.created_by) ?? "Pengguna"}
                  </span>
                  {user && comment.created_by === user.id && (
                    <form action={deleteComment}>
                      {hiddenFields}
                      <input type="hidden" name="commentId" value={comment.id} />
                      <button
                        type="submit"
                        className="text-[11px] text-zinc-400 transition-colors hover:text-red-600"
                      >
                        Hapus
                      </button>
                    </form>
                  )}
                </div>
                <p className="mt-0.5 text-[13px] text-zinc-600">
                  {renderMentionText(
                    comment.konten,
                    anggota.map((a) => a.email),
                    otherTasks,
                    listBase,
                  )}
                </p>
              </li>
            ))}
            {comments.length === 0 && (
              <li className="text-[13px] text-zinc-400">Belum ada komentar.</li>
            )}
          </ul>

          <form action={createComment} className="mt-2 flex items-start gap-2">
            {hiddenFields}
            <div className="flex-1">
              <textarea
                name="konten"
                rows={2}
                placeholder="Tulis komentar... (@email untuk mention, #[Judul Task] untuk tautkan Task)"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Kirim
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
