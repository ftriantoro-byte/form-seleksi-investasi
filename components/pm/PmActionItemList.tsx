"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteActionItem, convertActionItemToTask } from "@/actions/pm/meetings";

type PmActionItem = {
  id: string;
  deskripsi: string;
  assignee_id: string | null;
  due_date: string | null;
  task_id: string | null;
};

type PmListOption = { id: string; label: string };
type PmTaskInfo = { taskId: string; spaceId: string; listId: string; judul: string };

export function PmActionItemList({
  items,
  emailByUserId,
  listOptions,
  taskInfoByItemId,
  workspaceId,
}: {
  items: PmActionItem[];
  emailByUserId: Record<string, string>;
  listOptions: PmListOption[];
  taskInfoByItemId: Record<string, PmTaskInfo>;
  workspaceId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="mt-4 text-[14px] text-zinc-400">Belum ada Action Item.</p>;
  }

  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => {
        const taskInfo = item.task_id ? taskInfoByItemId[item.id] : null;
        return (
          <li key={item.id} className="rounded-xl bg-zinc-50 px-4 py-3 text-[13px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-zinc-800">{item.deskripsi}</p>
                <p className="mt-0.5 text-zinc-500">
                  {item.assignee_id ? (emailByUserId[item.assignee_id] ?? "-") : "Belum ada PIC"}
                  {item.due_date ? ` · Tenggat ${item.due_date}` : ""}
                </p>
              </div>
              {!item.task_id && (
                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      await deleteActionItem(item.id);
                      router.refresh();
                    });
                  }}
                  className="shrink-0 text-zinc-400 hover:text-red-600"
                >
                  Hapus
                </button>
              )}
            </div>

            {taskInfo ? (
              <Link
                href={`/pm/${workspaceId}/${taskInfo.spaceId}/${taskInfo.listId}/${taskInfo.taskId}`}
                className="mt-2 inline-block rounded-lg bg-white px-2.5 py-1 text-[12px] font-medium text-zinc-700 hover:underline"
              >
                → Task: {taskInfo.judul}
              </Link>
            ) : listOptions.length > 0 ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const listId = (form.elements.namedItem("listId") as HTMLSelectElement).value;
                  startTransition(async () => {
                    await convertActionItemToTask(item.id, listId);
                    router.refresh();
                  });
                }}
                className="mt-2 flex items-center gap-2"
              >
                <select
                  name="listId"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[12px] text-zinc-700 outline-none sm:max-w-xs"
                >
                  {listOptions.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-zinc-700"
                >
                  Jadikan Task
                </button>
              </form>
            ) : (
              <p className="mt-2 text-[12px] text-zinc-400">
                Belum ada List di Workspace ini untuk dijadikan tujuan Task.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
