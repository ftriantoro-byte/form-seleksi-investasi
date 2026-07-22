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

// Susulan permintaan user (ronde 2): bukan lagi 1 hari/1 jam, tapi grid 7
// hari x slot 30 menit, jam kerja 06:00-21:00 (30 slot), Task tampil sbg
// BLOK yg mem-span sesuai durasi (bukan cuma chip di baris awal - "area
// waktu tsb diblok oleh task itu"), drag bisa ke jam DAN hari manapun
// sekaligus dlm 1 grid. Pola render: tiap kolom hari = container relatif
// berisi (a) 30 div slot kosong tersusun normal (drop-target & klik utk
// quick-add per slot) + (b) lapisan absolute di atasnya isi blok Task
// (posisi top/height dihitung dari jam mulai & durasi) - pola umum utk
// calendar day/week view (Google Calendar dst), BUKAN native grid-row-span
// (lebih ribet dikombinasikan dgn drop-target di baliknya).
const START_HOUR = 6;
const END_HOUR = 21; // eksklusif - slot terakhir mulai 20:30, berakhir 21:00
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 22; // px
const SLOTS = Array.from(
  { length: ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES },
  (_, i) => {
    const totalMinutes = START_HOUR * 60 + i * SLOT_MINUTES;
    return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
  },
);
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DURATION_OPTIONS = [30, 60, 90, 120];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseDateStr(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(dateStr: string, delta: number) {
  const dt = parseDateStr(dateStr);
  dt.setDate(dt.getDate() + delta);
  return toDateStr(dt);
}

function todayStr() {
  return toDateStr(new Date());
}

// Minggu dimulai Minggu (index 0) - konsisten dgn urutan HARI di
// PmCalendarView yg sudah ada ("Min, Sen, Sel, ...").
function weekStartOf(dateStr: string) {
  const dt = parseDateStr(dateStr);
  return addDays(dateStr, -dt.getDay());
}

function slotIndexFromTime(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  const idx = Math.round(((h - START_HOUR) * 60 + m) / SLOT_MINUTES);
  return Math.min(Math.max(idx, 0), SLOTS.length - 1);
}

function formatWeekLabel(weekDates: string[]) {
  const start = parseDateStr(weekDates[0]);
  const end = parseDateStr(weekDates[6]);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const startLabel = start.toLocaleDateString("id-ID", opts);
  const endLabel = end.toLocaleDateString("id-ID", { ...opts, year: "numeric" });
  return `${startLabel} — ${endLabel}`;
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
  // pasti/tidak ambigu) atau Dashboard Workspace saat filter List/Inbox
  // sudah jelas. Kalau kosong, quick-add (klik slot) tidak aktif - drag
  // reschedule tetap aktif krn itu bukan "bikin baru".
  listId?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null); // `${date}-${slotIdx}`
  const [addTarget, setAddTarget] = useState<{ date: string; slotIdx: number } | null>(null);
  const [addValue, setAddValue] = useState("");

  const today = todayStr();
  const weekStart = weekStartOf(date);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  const unscheduled = tasks.filter(
    (t) => t.due_date && weekDates.includes(t.due_date) && !t.scheduled_time,
  );
  const byDate = new Map<string, PmTimeBoxTaskRow[]>();
  for (const t of tasks) {
    if (!t.due_date || !weekDates.includes(t.due_date) || !t.scheduled_time) continue;
    const list = byDate.get(t.due_date) ?? [];
    list.push(t);
    byDate.set(t.due_date, list);
  }

  function handleDrop(dateStr: string, slotIdx: number) {
    setDragOverCell(null);
    if (!dragTaskId) return;
    const taskId = dragTaskId;
    setDragTaskId(null);
    const existing = tasksById.get(taskId);
    const duration = existing?.scheduled_duration_minutes ?? 60;
    const { hour, minute } = SLOTS[slotIdx];
    startTransition(async () => {
      await scheduleTask(taskId, dateStr, `${pad2(hour)}:${pad2(minute)}:00`, duration);
      router.refresh();
    });
  }

  function handleUnschedule(taskId: string, dateStr: string) {
    startTransition(async () => {
      await scheduleTask(taskId, dateStr, null, null);
      router.refresh();
    });
  }

  function handleDurationChange(taskId: string, dateStr: string, scheduledTime: string, duration: number) {
    startTransition(async () => {
      await scheduleTask(taskId, dateStr, scheduledTime, duration);
      router.refresh();
    });
  }

  function toggleAdd(dateStr: string, slotIdx: number) {
    setAddValue("");
    setAddTarget((cur) => (cur?.date === dateStr && cur.slotIdx === slotIdx ? null : { date: dateStr, slotIdx }));
  }

  function submitAdd() {
    if (!addTarget || !listId) return;
    const judul = addValue.trim();
    if (!judul) return;
    const { date: d, slotIdx } = addTarget;
    const { hour, minute } = SLOTS[slotIdx];
    setAddValue("");
    startTransition(async () => {
      await createTaskQuick(listId, judul, d, `${pad2(hour)}:${pad2(minute)}:00`, 60);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={{
              pathname: listBase,
              query: { ...baseQuery, [viewParamKey]: "timebox", date: addDays(weekStart, -7) },
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Minggu sebelumnya"
          >
            ‹
          </Link>
          <span className="text-[14px] font-semibold text-zinc-900">{formatWeekLabel(weekDates)}</span>
          <Link
            href={{
              pathname: listBase,
              query: { ...baseQuery, [viewParamKey]: "timebox", date: addDays(weekStart, 7) },
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Minggu berikutnya"
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
          Minggu ini
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

      <div className="overflow-x-auto">
        <div className="grid min-w-[720px]" style={{ gridTemplateColumns: "44px repeat(7, 1fr)" }}>
          <div />
          {weekDates.map((d) => {
            const dt = parseDateStr(d);
            const isToday = d === today;
            return (
              <div key={d} className="px-1 pb-1.5 text-center">
                <div className="text-[10px] text-zinc-400">{HARI[dt.getDay()]}</div>
                <div
                  className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${
                    isToday ? "bg-blue-600 font-semibold text-white" : "text-zinc-700"
                  }`}
                >
                  {dt.getDate()}
                </div>
              </div>
            );
          })}

          <div>
            {SLOTS.map((s, i) => (
              <div
                key={i}
                style={{ height: SLOT_HEIGHT }}
                className="pr-1 text-right text-[9.5px] leading-none text-zinc-400"
              >
                {s.minute === 0 ? `${pad2(s.hour)}:00` : ""}
              </div>
            ))}
          </div>

          {weekDates.map((d) => {
            const dayTasks = byDate.get(d) ?? [];
            return (
              <div
                key={d}
                className="relative border-l border-black/[0.04]"
                style={{ height: SLOTS.length * SLOT_HEIGHT }}
              >
                {SLOTS.map((s, i) => {
                  const cellKey = `${d}-${i}`;
                  const isAdding = addTarget?.date === d && addTarget.slotIdx === i;
                  return (
                    <div
                      key={i}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverCell(cellKey);
                      }}
                      onDragLeave={() => setDragOverCell((cur) => (cur === cellKey ? null : cur))}
                      onDrop={() => handleDrop(d, i)}
                      onClick={() => listId && toggleAdd(d, i)}
                      style={{ height: SLOT_HEIGHT }}
                      className={`border-b ${
                        s.minute === 0 ? "border-zinc-100" : "border-zinc-50"
                      } transition-colors ${
                        dragOverCell === cellKey || isAdding ? "bg-blue-50" : ""
                      } ${listId ? "cursor-pointer" : ""}`}
                    />
                  );
                })}

                {addTarget?.date === d && (
                  <div
                    style={{ top: addTarget.slotIdx * SLOT_HEIGHT, left: 2 }}
                    className="absolute z-20 w-40"
                  >
                    <input
                      autoFocus
                      value={addValue}
                      onChange={(e) => setAddValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          submitAdd();
                        } else if (e.key === "Escape") {
                          setAddTarget(null);
                        }
                      }}
                      placeholder="Judul, Enter..."
                      className="w-full rounded border border-blue-300 bg-white px-1 py-0.5 text-[10px] text-zinc-900 shadow-md outline-none focus:border-blue-400"
                    />
                  </div>
                )}

                {dayTasks.map((t) => {
                  const startIdx = slotIndexFromTime(t.scheduled_time as string);
                  const durationSlots = Math.max(
                    1,
                    Math.round((t.scheduled_duration_minutes ?? 60) / SLOT_MINUTES),
                  );
                  const top = startIdx * SLOT_HEIGHT;
                  const height = Math.min(durationSlots * SLOT_HEIGHT, SLOTS.length * SLOT_HEIGHT - top) - 1;
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setDragTaskId(t.id);
                      }}
                      onDragEnd={() => setDragTaskId(null)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.stopPropagation();
                        handleDrop(d, startIdx);
                      }}
                      style={{ top, height, left: 1, right: 1 }}
                      className={`group absolute cursor-grab overflow-hidden rounded px-1 py-0.5 text-[10px] leading-tight shadow-sm active:cursor-grabbing ${
                        TASK_STATUS_BADGE_KELAS[t.status] ?? "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnschedule(t.id, d);
                        }}
                        aria-label="Lepas dari jadwal jam"
                        className="absolute right-0.5 top-0.5 hidden text-[9px] opacity-70 hover:opacity-100 group-hover:block"
                      >
                        ✕
                      </button>
                      <Link
                        href={t.href ?? `${listBase}/${t.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate pr-2.5 hover:underline"
                      >
                        {t.judul}
                      </Link>
                      {durationSlots >= 2 && (
                        <select
                          value={t.scheduled_duration_minutes ?? 60}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            handleDurationChange(
                              t.id,
                              d,
                              t.scheduled_time as string,
                              Number(e.target.value),
                            )
                          }
                          className="mt-0.5 rounded border-none bg-white/60 text-[9px] outline-none"
                        >
                          {DURATION_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}m
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
