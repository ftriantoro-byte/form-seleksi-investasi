import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { renameList, deleteList } from "@/actions/pm/lists";
import { createTask } from "@/actions/pm/tasks";
import {
  TASK_STATUS_VALUES,
  TASK_PRIORITY_VALUES,
} from "@/lib/pm/schema";
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_BADGE_KELAS,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_BADGE_KELAS,
} from "@/lib/pm/labels";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { FormField } from "@/components/ui/FormField";

type PmWorkspaceMemberProfile = { user_id: string; email: string };

type PmTaskRow = {
  id: string;
  judul: string;
  status: string;
  priority: string | null;
  assignee_id: string | null;
  due_date: string | null;
};

export default async function ListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; spaceId: string; listId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspaceId, spaceId, listId } = await params;
  const { error } = await searchParams;
  // Akses modul PM sudah dicek di app/pm/layout.tsx.
  const supabase = await createClient();

  const { data: list } = await supabase
    .from("pm_lists")
    .select("id, nama, deskripsi, space_id")
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

  const [{ data: tasksRaw }, { data: anggotaRaw }] = await Promise.all([
    supabase
      .from("pm_tasks")
      .select("id, judul, status, priority, assignee_id, due_date")
      .eq("list_id", listId)
      .order("created_at", { ascending: true }),
    supabase.rpc("pm_workspace_member_profiles", { p_workspace_id: workspaceId }),
  ]);

  const tasks = (tasksRaw ?? []) as PmTaskRow[];
  const anggota = (anggotaRaw ?? []) as PmWorkspaceMemberProfile[];
  const emailByUserId = new Map(anggota.map((a) => [a.user_id, a.email]));

  return (
    <FormPageShell maxWidth="max-w-4xl">
      <FormPageHeader
        title={list.nama}
        subtitle={list.deskripsi ?? undefined}
        backHref={`/pm/${workspaceId}/${spaceId}`}
        backLabel="Kembali ke Space"
      />

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-400">
                <th className="px-6 py-3.5 font-medium">Task</th>
                <th className="px-3 py-3.5 font-medium">Assignee</th>
                <th className="px-3 py-3.5 font-medium">Due Date</th>
                <th className="px-3 py-3.5 font-medium">Status</th>
                <th className="px-3 py-3.5 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="border-b border-zinc-50 transition-colors duration-100 last:border-0 hover:bg-zinc-50/60"
                >
                  <td className="px-6 py-3.5 font-medium text-zinc-800">
                    <Link
                      href={`/pm/${workspaceId}/${spaceId}/${listId}/${task.id}`}
                      className="hover:underline"
                    >
                      {task.judul}
                    </Link>
                  </td>
                  <td className="px-3 py-3.5 text-zinc-500">
                    {task.assignee_id ? (emailByUserId.get(task.assignee_id) ?? "-") : "-"}
                  </td>
                  <td className="px-3 py-3.5 text-zinc-500">{task.due_date ?? "-"}</td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        TASK_STATUS_BADGE_KELAS[task.status] ?? "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {TASK_STATUS_LABEL[task.status] ?? task.status}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    {task.priority && (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          TASK_PRIORITY_BADGE_KELAS[task.priority] ?? "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {TASK_PRIORITY_LABEL[task.priority] ?? task.priority}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-400">
                    Belum ada Task.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Buat Task baru</h3>
        <form action={createTask} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="listId" value={listId} />

          <div className="sm:col-span-2">
            <FormField label="Judul Task" name="judul" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-zinc-500">Assignee</label>
            <select
              name="assigneeId"
              defaultValue=""
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

          <FormField label="Due Date" name="dueDate" type="date" required={false} />

          <div>
            <label className="block text-[13px] font-medium text-zinc-500">Status</label>
            <select
              name="status"
              defaultValue="to_do"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            >
              {TASK_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {TASK_STATUS_LABEL[value]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-zinc-500">Priority</label>
            <select
              name="priority"
              defaultValue=""
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
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
              className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Buat Task
            </button>
          </div>
        </form>
      </div>

      <div className="mt-10 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Pengaturan List</h3>
        <form action={renameList} className="mt-4 grid grid-cols-1 gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="listId" value={listId} />
          <FormField label="Nama List" name="nama" defaultValue={list.nama} />
          <div>
            <label className="block text-[13px] font-medium text-zinc-500">
              Deskripsi (opsional)
            </label>
            <textarea
              name="deskripsi"
              rows={2}
              defaultValue={list.deskripsi ?? ""}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none transition-all duration-150 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <button
            type="submit"
            className="w-fit rounded-full bg-zinc-100 px-5 py-2.5 text-[14px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
          >
            Simpan Perubahan
          </button>
        </form>

        <form action={deleteList} className="mt-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="listId" value={listId} />
          <button
            type="submit"
            className="text-[13px] font-medium text-red-500 transition-colors hover:text-red-700"
          >
            Hapus List ini
          </button>
        </form>
      </div>
    </FormPageShell>
  );
}
