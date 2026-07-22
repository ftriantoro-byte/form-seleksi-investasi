"use client";

import Link from "next/link";
import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { updateTaskStatus } from "@/actions/pm/tasks";
import { TASK_STATUS_VALUES } from "@/lib/pm/schema";
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_BADGE_KELAS,
  TASK_COLOR_ACCENT_KELAS,
} from "@/lib/pm/labels";

type PmTaskRow = {
  id: string;
  judul: string;
  status: string;
  priority: string | null;
  assignee_ids: string[];
  due_date: string | null;
  recurrence_type: string | null;
  color: string | null;
  tags: string[];
  // Dipakai Dashboard Workspace (agregat lintas List) - tiap Task punya List
  // sendiri jadi tidak bisa pakai 1 `listBase` bersama seperti di halaman
  // List. Kalau tidak diisi, fallback ke `${listBase}/${task.id}` seperti
  // semula. Data (bukan function) karena komponen ini "use client" - function
  // dari Server Component tidak bisa lolos RSC boundary.
  href?: string;
};

export function PmBoardView({
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
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  // Drag antar kolom butuh kartu Task PINDAH KOLOM seketika (bukan nunggu
  // router.refresh() selesai round-trip server) supaya berasa responsif -
  // update status optimis dulu, `router.refresh()` nanti nyamain state asli
  // (otomatis "dibatalkan" balik ke `tasks` asli kalau action-nya gagal).
  const [optimisticTasks, setOptimisticStatus] = useOptimistic(
    tasks,
    (state, update: { taskId: string; status: string }) =>
      state.map((t) => (t.id === update.taskId ? { ...t, status: update.status } : t)),
  );

  function handleDrop(status: string) {
    setDragOverStatus(null);
    if (!dragTaskId) return;
    const taskId = dragTaskId;
    setDragTaskId(null);
    startTransition(async () => {
      setOptimisticStatus({ taskId, status });
      await updateTaskStatus(taskId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {TASK_STATUS_VALUES.map((status) => {
        const tasksInColumn = optimisticTasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus((cur) => (cur === status ? null : cur))}
            onDrop={() => handleDrop(status)}
            className={`flex w-64 shrink-0 flex-col rounded-2xl p-3 transition-colors ${
              dragOverStatus === status ? "bg-zinc-200/70" : "bg-zinc-100/60"
            }`}
          >
            <div className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-semibold text-zinc-600">
              {statusLabels[status]}
              <span className="text-zinc-400">{tasksInColumn.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {tasksInColumn.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragTaskId(task.id)}
                  onDragEnd={() => setDragTaskId(null)}
                  className={`pm-card cursor-grab rounded-xl border border-black/[0.04] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] active:cursor-grabbing ${
                    task.color ? TASK_COLOR_ACCENT_KELAS[task.color] : ""
                  }`}
                >
                  <Link
                    href={task.href ?? `${listBase}/${task.id}`}
                    className="text-[13px] font-medium text-zinc-800 hover:underline"
                  >
                    {task.recurrence_type && <span aria-label="Berulang">🔁 </span>}
                    {task.judul}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {task.priority && (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          TASK_PRIORITY_BADGE_KELAS[task.priority] ?? "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {TASK_PRIORITY_LABEL[task.priority]}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="text-[11px] text-zinc-400">{task.due_date}</span>
                    )}
                  </div>
                  {task.assignee_ids.length > 0 && (
                    <div className="mt-1 truncate text-[11px] text-zinc-400">
                      {task.assignee_ids.map((id) => emailByUserId[id] ?? "").join(", ")}
                    </div>
                  )}
                  {task.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {task.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {tasksInColumn.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-center text-[12px] text-zinc-300">
                  Kosong
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
