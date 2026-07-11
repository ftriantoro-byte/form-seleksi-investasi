"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStickyNote,
  updateStickyPosition,
  updateStickyContent,
  updateStickyColor,
  deleteStickyNote,
  convertStickyToTask,
} from "@/actions/pm/whiteboards";
import { STICKY_COLOR_VALUES } from "@/lib/pm/schema";

type PmWhiteboardItem = {
  id: string;
  konten: string;
  warna: string;
  pos_x: number;
  pos_y: number;
  task_id: string | null;
};

type PmTaskInfo = { taskId: string; listId: string; judul: string };
type PmListOption = { id: string; nama: string };

const WARNA_KELAS: Record<string, string> = {
  yellow: "bg-yellow-100 border-yellow-200",
  pink: "bg-pink-100 border-pink-200",
  blue: "bg-blue-100 border-blue-200",
  green: "bg-green-100 border-green-200",
};

export function PmWhiteboardCanvas({
  whiteboardId,
  items,
  taskInfoByItemId,
  lists,
  workspaceId,
  spaceId,
}: {
  whiteboardId: string;
  items: PmWhiteboardItem[];
  taskInfoByItemId: Record<string, PmTaskInfo>;
  lists: PmListOption[];
  workspaceId: string;
  spaceId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [dragItemId, setDragItemId] = useState<string | null>(null);

  function percentFromEvent(clientX: number, clientY: number, offsetX = 0, offsetY = 0) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 10, y: 10 };
    const x = ((clientX - rect.left - offsetX) / rect.width) * 100;
    const y = ((clientY - rect.top - offsetY) / rect.height) * 100;
    return { x, y };
  }

  return (
    <div
      ref={canvasRef}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const { x, y } = percentFromEvent(e.clientX, e.clientY);
        startTransition(async () => {
          await createStickyNote(whiteboardId, x, y);
          router.refresh();
        });
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (!dragItemId) return;
        const itemId = dragItemId;
        setDragItemId(null);
        const { x, y } = percentFromEvent(
          e.clientX,
          e.clientY,
          dragOffset.current.x,
          dragOffset.current.y,
        );
        startTransition(async () => {
          await updateStickyPosition(itemId, x, y);
          router.refresh();
        });
      }}
      className="relative h-[560px] w-full overflow-hidden rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/60"
    >
      {items.length === 0 && (
        <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] text-zinc-300">
          Klik area kosong untuk menambah sticky note.
        </p>
      )}
      {items.map((item) => {
        const taskInfo = item.task_id ? taskInfoByItemId[item.id] : null;
        return (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
              setDragItemId(item.id);
            }}
            onDragEnd={() => setDragItemId(null)}
            style={{ left: `${item.pos_x}%`, top: `${item.pos_y}%` }}
            className={`absolute w-48 cursor-grab rounded-xl border p-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)] active:cursor-grabbing ${WARNA_KELAS[item.warna] ?? WARNA_KELAS.yellow}`}
          >
            <textarea
              defaultValue={item.konten}
              rows={3}
              placeholder="Tulis catatan..."
              onBlur={(e) => {
                const konten = e.target.value;
                startTransition(async () => {
                  await updateStickyContent(item.id, konten);
                  router.refresh();
                });
              }}
              className="w-full resize-none border-none bg-transparent text-[13px] text-zinc-800 outline-none placeholder:text-zinc-400"
            />
            <div className="mt-1 flex items-center justify-between gap-1">
              <div className="flex gap-1">
                {STICKY_COLOR_VALUES.map((warna) => (
                  <button
                    key={warna}
                    type="button"
                    onClick={() => {
                      startTransition(async () => {
                        await updateStickyColor(item.id, warna);
                        router.refresh();
                      });
                    }}
                    className={`h-3.5 w-3.5 rounded-full border border-black/10 ${WARNA_KELAS[warna]}`}
                    aria-label={`Warna ${warna}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    await deleteStickyNote(item.id);
                    router.refresh();
                  });
                }}
                className="text-[11px] text-zinc-400 hover:text-red-600"
              >
                Hapus
              </button>
            </div>

            {taskInfo ? (
              <Link
                href={`/pm/${workspaceId}/${spaceId}/${taskInfo.listId}/${taskInfo.taskId}`}
                className="mt-2 block truncate rounded-lg bg-white/70 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:underline"
              >
                → Task: {taskInfo.judul}
              </Link>
            ) : lists.length > 0 ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const listId = (form.elements.namedItem("listId") as HTMLSelectElement).value;
                  startTransition(async () => {
                    await convertStickyToTask(item.id, listId);
                    router.refresh();
                  });
                }}
                className="mt-2 flex items-center gap-1"
              >
                <select
                  name="listId"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-1.5 py-1 text-[11px] text-zinc-700 outline-none"
                >
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.nama}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-700"
                >
                  Jadikan Task
                </button>
              </form>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
