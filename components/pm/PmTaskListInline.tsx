"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTaskStatus, updateTaskPriority, updateTaskDueDate } from "@/actions/pm/tasks";
import { TASK_STATUS_VALUES, TASK_PRIORITY_VALUES } from "@/lib/pm/schema";
import { TASK_PRIORITY_LABEL } from "@/lib/pm/labels";

type PmTaskRow = {
  id: string;
  judul: string;
  status: string;
  priority: string | null;
  assignee_id: string | null;
  due_date: string | null;
};

// Edit inline langsung di baris tabel List (Status/Priority/Due Date) tanpa
// perlu buka Task Detail - dipanggil langsung (bukan lewat <form>), pola
// sama seperti PmBoardView drag-and-drop.
export function PmTaskListInline({
  tasks,
  emailByUserId,
  listBase,
  statusLabels,
}: {
  tasks: PmTaskRow[];
  emailByUserId: Record<string, string>;
  listBase: string;
  statusLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <tbody>
      {tasks.map((task) => (
        <tr
          key={task.id}
          className="border-b border-zinc-50 transition-colors duration-100 last:border-0 hover:bg-zinc-50/60"
        >
          <td className="px-4 py-2 font-medium text-zinc-800">
            <Link href={`${listBase}/${task.id}`} className="hover:underline">
              {task.judul}
            </Link>
          </td>
          <td className="px-2 py-2 text-zinc-500">
            {task.assignee_id ? (emailByUserId[task.assignee_id] ?? "-") : "-"}
          </td>
          <td className="px-2 py-2">
            <input
              type="date"
              defaultValue={task.due_date ?? ""}
              onChange={(e) => {
                const dueDate = e.target.value;
                startTransition(async () => {
                  await updateTaskDueDate(task.id, dueDate);
                  router.refresh();
                });
              }}
              className="rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-[12px] text-zinc-600 outline-none hover:border-zinc-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
            />
          </td>
          <td className="px-2 py-2">
            <select
              defaultValue={task.status}
              onChange={(e) => {
                const status = e.target.value;
                startTransition(async () => {
                  await updateTaskStatus(task.id, status);
                  router.refresh();
                });
              }}
              className="rounded-full border border-transparent bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 outline-none hover:border-zinc-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
            >
              {TASK_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </td>
          <td className="px-2 py-2">
            <select
              defaultValue={task.priority ?? ""}
              onChange={(e) => {
                const priority = e.target.value;
                startTransition(async () => {
                  await updateTaskPriority(task.id, priority);
                  router.refresh();
                });
              }}
              className="rounded-full border border-transparent bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 outline-none hover:border-zinc-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
            >
              <option value="">-</option>
              {TASK_PRIORITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {TASK_PRIORITY_LABEL[value]}
                </option>
              ))}
            </select>
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
  );
}
