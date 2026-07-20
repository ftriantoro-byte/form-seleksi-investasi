"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TASK_STATUS_BADGE_KELAS } from "@/lib/pm/labels";
import { updateTaskDueDate, createTaskQuick } from "@/actions/pm/tasks";

type PmCalendarTaskRow = {
  id: string;
  judul: string;
  status: string;
  due_date: string | null;
  // Dipakai Dashboard Workspace (agregat lintas List) - tiap Task punya List
  // sendiri jadi tidak bisa pakai 1 `listBase` bersama seperti di halaman
  // List. Kalau tidak diisi, fallback ke `${listBase}/${id}` seperti semula.
  href?: string;
};

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function formatMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function PmCalendarView({
  tasks,
  listBase,
  month,
  baseQuery,
  viewParamKey = "view",
  listId,
}: {
  tasks: PmCalendarTaskRow[];
  listBase: string;
  month: string;
  baseQuery: Record<string, string>;
  // Nama query param buat switch tab/view - halaman List pakai "view",
  // Dashboard Workspace pakai "tab" utk 3 tab statistik yang sudah ada
  // sebelumnya, jadi dibuat bisa diatur supaya nav bulan tetap konsisten
  // dengan skema masing-masing halaman.
  viewParamKey?: string;
  // Cuma diisi dari halaman List (1 List pasti/tidak ambigu) - dipakai buat
  // aktifkan quick-add Task lewat klik tanggal. Dashboard Workspace (agregat
  // lintas List) SENGAJA tidak dikasih ini (list tujuan ambigu, keputusan
  // yang sama dgn tab List/Board Dashboard - lihat PROGRESS.md) jadi
  // quick-add otomatis tidak aktif di sana, drag & unscheduled list tetap
  // jalan (murni mengatur Task yang sudah ada, bukan bikin baru).
  listId?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [addValue, setAddValue] = useState("");

  const [year, monthNum] = month.split("-").map(Number);
  const firstOfMonth = new Date(year, monthNum - 1, 1);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const tasksByDate = new Map<string, PmCalendarTaskRow[]>();
  const unscheduled: PmCalendarTaskRow[] = [];
  for (const t of tasks) {
    if (!t.due_date) {
      unscheduled.push(t);
      continue;
    }
    const list = tasksByDate.get(t.due_date) ?? [];
    list.push(t);
    tasksByDate.set(t.due_date, list);
  }

  const prevMonthDate = new Date(year, monthNum - 2, 1);
  const nextMonthDate = new Date(year, monthNum, 1);
  const prevMonth = formatMonth(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1);
  const nextMonth = formatMonth(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = firstOfMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const now = new Date();
  const todayMonth = formatMonth(now.getFullYear(), now.getMonth() + 1);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  function handleDrop(dateStr: string) {
    setDragOverDate(null);
    if (!dragTaskId) return;
    const taskId = dragTaskId;
    setDragTaskId(null);
    startTransition(async () => {
      await updateTaskDueDate(taskId, dateStr);
      router.refresh();
    });
  }

  function toggleAdd(dateStr: string) {
    setAddValue("");
    setAddDate((cur) => (cur === dateStr ? null : dateStr));
  }

  function submitAdd(dateStr: string) {
    const judul = addValue.trim();
    if (!judul || !listId) return;
    setAddValue("");
    startTransition(async () => {
      await createTaskQuick(listId, judul, dateStr);
      router.refresh();
    });
  }

  function taskChip(t: PmCalendarTaskRow) {
    return (
      <Link
        key={t.id}
        href={t.href ?? `${listBase}/${t.id}`}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          setDragTaskId(t.id);
        }}
        onDragEnd={() => setDragTaskId(null)}
        onClick={(e) => e.stopPropagation()}
        className={`block cursor-grab truncate rounded px-1 py-0.5 text-[10px] active:cursor-grabbing ${
          TASK_STATUS_BADGE_KELAS[t.status] ?? "bg-zinc-100 text-zinc-600"
        }`}
      >
        {t.judul}
      </Link>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={{
              pathname: listBase,
              query: { ...baseQuery, [viewParamKey]: "calendar", month: prevMonth },
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Bulan sebelumnya"
          >
            ‹
          </Link>
          <span className="text-[14px] font-semibold text-zinc-900">{monthLabel}</span>
          <Link
            href={{
              pathname: listBase,
              query: { ...baseQuery, [viewParamKey]: "calendar", month: nextMonth },
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Bulan berikutnya"
          >
            ›
          </Link>
        </div>
        <Link
          href={{
            pathname: listBase,
            query: { ...baseQuery, [viewParamKey]: "calendar", month: todayMonth },
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
            Belum dijadwalkan ({unscheduled.length}) — geser ke tanggal utk menetapkan Due Date
          </div>
          <div className="flex flex-wrap gap-1.5 px-1">
            {unscheduled.map((t) => (
              <Link
                key={t.id}
                href={t.href ?? `${listBase}/${t.id}`}
                draggable
                onDragStart={() => setDragTaskId(t.id)}
                onDragEnd={() => setDragTaskId(null)}
                className={`cursor-grab rounded-full px-2.5 py-1 text-[11px] active:cursor-grabbing ${
                  TASK_STATUS_BADGE_KELAS[t.status] ?? "bg-zinc-100 text-zinc-600"
                }`}
              >
                {t.judul}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-1.5 grid grid-cols-7 gap-1.5 px-1 text-[11px] text-zinc-400">
        {HARI.map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTasks = tasksByDate.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;
          const isAdding = addDate === dateStr;
          return (
            <div
              key={dateStr}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDate(dateStr);
              }}
              onDragLeave={() => setDragOverDate((cur) => (cur === dateStr ? null : cur))}
              onDrop={() => handleDrop(dateStr)}
              onClick={() => listId && toggleAdd(dateStr)}
              className={`min-h-[84px] rounded-xl border p-1.5 transition-colors ${
                dragOverDate === dateStr
                  ? "border-blue-300 bg-blue-50"
                  : "border-black/[0.04] bg-white"
              } ${listId ? "cursor-pointer" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    isToday ? "bg-blue-600 font-semibold text-white" : "text-zinc-400"
                  }`}
                >
                  {day}
                </div>
                {listId && (
                  <span
                    className="text-[13px] leading-none text-zinc-300 transition-colors hover:text-zinc-600"
                    aria-hidden
                  >
                    +
                  </span>
                )}
              </div>
              <div className="mt-1 space-y-1">
                {dayTasks.slice(0, 3).map((t) => taskChip(t))}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-zinc-400">+{dayTasks.length - 3} lagi</div>
                )}
              </div>
              {isAdding && (
                <input
                  autoFocus
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitAdd(dateStr);
                    } else if (e.key === "Escape") {
                      setAddDate(null);
                    }
                  }}
                  placeholder="Judul Task, Enter..."
                  className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-1.5 py-1 text-[10.5px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
