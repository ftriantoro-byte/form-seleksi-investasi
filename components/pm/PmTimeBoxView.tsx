"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TASK_STATUS_BADGE_KELAS } from "@/lib/pm/labels";
import { scheduleTask, createTaskQuick } from "@/actions/pm/tasks";

type PmTimeBoxTaskRow = {
  id: string;
  judul: string;
  status: string;
  due_date: string | null;
  scheduled_time: string | null;
  scheduled_duration_minutes: number | null;
  // Dipakai Dashboard Workspace (agregat lintas List), sama seperti
  // PmCalendarView/PmBoardView - fallback ke `${listBase}/${id}` kalau
  // tidak diisi (konteks halaman List, 1 List pasti).
  href?: string;
};

// Jam kerja 06:00-21:00 (16 baris) - cakupan wajar utk time-boxing harian,
// bukan 24 jam penuh supaya grid tidak kepanjangan/kebanyakan baris kosong.
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function addDays(dateStr: string, delta: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function PmTimeBoxView({
  tasks,
  listBase,
  date,
  baseQuery,
  viewParamKey = "view",
  listId,
}: {
  tasks: PmTimeBoxTaskRow[];
  listBase: string;
  date: string;
  baseQuery: Record<string, string>;
  viewParamKey?: string;
  // Sama seperti PmCalendarView - cuma diisi dari halaman List (1 List
  // pasti/tidak ambigu), Dashboard Workspace SENGAJA tidak dikasih ini jadi
  // quick-add tidak aktif di sana (drag/jadwal-ulang tetap aktif, itu bukan
  // "bikin baru").
  listId?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [addHour, setAddHour] = useState<number | null>(null);
  const [addValue, setAddValue] = useState("");

  const today = todayStr();
  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  const unscheduled = tasks.filter((t) => t.due_date === date && !t.scheduled_time);
  const byHour = new Map<number, PmTimeBoxTaskRow[]>();
  for (const t of tasks) {
    if (t.due_date !== date || !t.scheduled_time) continue;
    const hour = parseInt(t.scheduled_time.slice(0, 2), 10);
    const list = byHour.get(hour) ?? [];
    list.push(t);
    byHour.set(hour, list);
  }

  function handleDrop(hour: number) {
    setDragOverHour(null);
    if (!dragTaskId) return;
    const taskId = dragTaskId;
    setDragTaskId(null);
    const existing = tasksById.get(taskId);
    const duration = existing?.scheduled_duration_minutes ?? 60;
    startTransition(async () => {
      await scheduleTask(taskId, date, `${pad2(hour)}:00`, duration);
      router.refresh();
    });
  }

  function handleUnschedule(taskId: string) {
    startTransition(async () => {
      await scheduleTask(taskId, date, null, null);
      router.refresh();
    });
  }

  function handleDurationChange(taskId: string, duration: number) {
    const existing = tasksById.get(taskId);
    if (!existing?.scheduled_time) return;
    startTransition(async () => {
      await scheduleTask(taskId, date, existing.scheduled_time, duration);
      router.refresh();
    });
  }

  function toggleAdd(hour: number) {
    setAddValue("");
    setAddHour((cur) => (cur === hour ? null : hour));
  }

  function submitAdd(hour: number) {
    const judul = addValue.trim();
    if (!judul || !listId) return;
    setAddValue("");
    startTransition(async () => {
      await createTaskQuick(listId, judul, date, `${pad2(hour)}:00`, 60);
      router.refresh();
    });
  }

  function taskChip(t: PmTimeBoxTaskRow, opts: { showDuration?: boolean } = {}) {
    return (
      <div
        key={t.id}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          setDragTaskId(t.id);
        }}
        onDragEnd={() => setDragTaskId(null)}
        className={`flex cursor-grab items-center gap-1.5 rounded px-1.5 py-1 text-[11px] active:cursor-grabbing ${
          TASK_STATUS_BADGE_KELAS[t.status] ?? "bg-zinc-100 text-zinc-600"
        }`}
      >
        <Link
          href={t.href ?? `${listBase}/${t.id}`}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 truncate hover:underline"
        >
          {t.judul}
        </Link>
        {opts.showDuration && (
          <>
            <select
              value={t.scheduled_duration_minutes ?? 60}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleDurationChange(t.id, Number(e.target.value))}
              className="shrink-0 rounded border-none bg-white/60 text-[10px] outline-none"
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}m
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUnschedule(t.id);
              }}
              aria-label="Lepas dari jadwal jam"
              className="shrink-0 text-[10px] text-current opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={{
              pathname: listBase,
              query: { ...baseQuery, [viewParamKey]: "timebox", date: addDays(date, -1) },
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Hari sebelumnya"
          >
            ‹
          </Link>
          <span className="text-[14px] font-semibold text-zinc-900">{formatDateLabel(date)}</span>
          <Link
            href={{
              pathname: listBase,
              query: { ...baseQuery, [viewParamKey]: "timebox", date: addDays(date, 1) },
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Hari berikutnya"
          >
            ›
          </Link>
        </div>
        <Link
          href={{
            pathname: listBase,
            query: { ...baseQuery, [viewParamKey]: "timebox", date: today },
          }}
          className="text-[12px] font-medium text-blue-600 hover:underline"
        >
          Hari ini
        </Link>
      </div>

      {unscheduled.length > 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          className="mb-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 p-2"
        >
          <div className="mb-1.5 px-1 text-[11px] font-medium text-zinc-400">
            Belum dijadwalkan jamnya ({unscheduled.length}) — geser ke slot jam di bawah
          </div>
          <div className="flex flex-wrap gap-1.5 px-1">
            {unscheduled.map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={() => setDragTaskId(t.id)}
                onDragEnd={() => setDragTaskId(null)}
                className={`cursor-grab rounded-full px-2.5 py-1 text-[11px] active:cursor-grabbing ${
                  TASK_STATUS_BADGE_KELAS[t.status] ?? "bg-zinc-100 text-zinc-600"
                }`}
              >
                <Link href={t.href ?? `${listBase}/${t.id}`} className="hover:underline">
                  {t.judul}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-black/[0.04]">
        {HOURS.map((hour) => {
          const hourTasks = byHour.get(hour) ?? [];
          const isAdding = addHour === hour;
          return (
            <div
              key={hour}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverHour(hour);
              }}
              onDragLeave={() => setDragOverHour((cur) => (cur === hour ? null : cur))}
              onDrop={() => handleDrop(hour)}
              onClick={() => listId && toggleAdd(hour)}
              className={`flex min-h-[44px] items-start gap-3 border-b border-black/[0.04] px-3 py-2 last:border-b-0 transition-colors ${
                dragOverHour === hour ? "bg-blue-50" : "bg-white"
              } ${listId ? "cursor-pointer" : ""}`}
            >
              <div className="w-12 shrink-0 pt-0.5 text-[11px] text-zinc-400">{pad2(hour)}:00</div>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {hourTasks.map((t) => taskChip(t, { showDuration: true }))}
                {isAdding && (
                  <input
                    autoFocus
                    value={addValue}
                    onChange={(e) => setAddValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitAdd(hour);
                      } else if (e.key === "Escape") {
                        setAddHour(null);
                      }
                    }}
                    placeholder="Judul Task, Enter..."
                    className="min-w-[160px] flex-1 rounded-lg border border-blue-200 bg-white px-1.5 py-1 text-[11px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
