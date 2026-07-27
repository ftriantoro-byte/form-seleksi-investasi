"use client";

import Link from "next/link";
import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import {
  TASK_STATUS_BADGE_KELAS,
  TASK_COLOR_FILL_KELAS,
  TASK_STATUS_BORDER_KELAS,
  avatarKelasForUserId,
} from "@/lib/pm/labels";
import { scheduleTask, createTaskQuick } from "@/actions/pm/tasks";
import { projectRecurringOccurrences, type PmRecurrenceType } from "@/lib/pm/recurrence";

type PmTimeBoxTaskRow = {
  id: string;
  judul: string;
  status: string;
  due_date: string | null;
  scheduled_time: string | null;
  scheduled_duration_minutes: number | null;
  recurrence_type: string | null;
  recurrence_interval: number;
  recurrence_end_date: string | null;
  color: string | null;
  assignee_ids: string[];
  // Dipakai Dashboard Workspace (agregat lintas List), sama seperti
  // PmCalendarView/PmBoardView - fallback ke `${listBase}/${id}` kalau
  // tidak diisi (konteks halaman List, 1 List pasti).
  href?: string;
};

// Blok "proyeksi" siklus berulang MASA DEPAN yang jatuh dalam minggu yang
// sedang dilihat - lihat lib/pm/recurrence.ts (projectRecurringOccurrences).
type PmTimeBoxVirtualBlock = { task: PmTimeBoxTaskRow; date: string };

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

type OverlapItem = { id: string; start: number; end: number };
type OverlapLayout = { col: number; cols: number };

// Susulan permintaan user: sebelumnya blok Task yang jam-nya tumpang
// tindih saling menutupi total (semua full-width, blok yang dirender
// belakangan nutupin yang duluan) - sekarang tumpang tindih dibagi jadi
// kolom berdampingan spt Google Calendar, supaya semua tetap kelihatan.
// Pola standar "event overlap layout": urutkan by jam mulai, gabung jadi
// "cluster" selama overlap (mulai berikutnya < akhir maksimum cluster yang
// berjalan), lalu di dalam tiap cluster tempatkan tiap item ke kolom
// PALING KIRI yang sudah kosong (greedy) - jumlah kolom dalam 1 cluster
// dipakai sbg pembagi lebar rata utk SEMUA anggota cluster itu (bukan cuma
// yang benar-benar bertabrakan satu sama lain, spt lazimnya kalender).
function computeOverlapLayout(items: OverlapItem[]): Map<string, OverlapLayout> {
  const layout = new Map<string, OverlapLayout>();
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);

  let cluster: OverlapItem[] = [];
  let clusterEnd = -Infinity;

  function flush() {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    const colOf = new Map<string, number>();
    for (const it of cluster) {
      let placed = false;
      for (let c = 0; c < columnEnds.length; c++) {
        if (columnEnds[c] <= it.start) {
          columnEnds[c] = it.end;
          colOf.set(it.id, c);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columnEnds.push(it.end);
        colOf.set(it.id, columnEnds.length - 1);
      }
    }
    const cols = columnEnds.length;
    for (const it of cluster) {
      layout.set(it.id, { col: colOf.get(it.id) ?? 0, cols });
    }
    cluster = [];
    clusterEnd = -Infinity;
  }

  for (const it of sorted) {
    if (cluster.length > 0 && it.start < clusterEnd) {
      cluster.push(it);
      clusterEnd = Math.max(clusterEnd, it.end);
    } else {
      flush();
      cluster.push(it);
      clusterEnd = it.end;
    }
  }
  flush();

  return layout;
}

export function PmTimeBoxView({
  tasks,
  listBase,
  date,
  baseQuery,
  viewParamKey = "view",
  listId,
  assigneeFilterIds,
  emailByUserId,
}: {
  tasks: PmTimeBoxTaskRow[];
  listBase: string;
  date: string;
  baseQuery: Record<string, string | string[]>;
  viewParamKey?: string;
  // Sama seperti PmCalendarView - cuma diisi dari halaman List (1 List
  // pasti/tidak ambigu) atau Dashboard Workspace saat filter List/Inbox
  // sudah jelas. Kalau kosong, quick-add (klik slot) tidak aktif - drag
  // reschedule tetap aktif krn itu bukan "bikin baru".
  listId?: string;
  // Susulan permintaan user: assignee yg sedang difilter (Dashboard) -
  // Task baru dari quick-add otomatis di-assign ke daftar ini. Kosong di
  // halaman List (belum ada filter assignee multi-select di sana).
  assigneeFilterIds?: string[];
  // Susulan permintaan user: dipakai utk tampilkan avatar per-assignee di
  // tiap blok Task ("tanda khusus... supaya bisa lihat task siapa").
  emailByUserId?: Record<string, string>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null); // `${date}-${slotIdx}`
  const [addTarget, setAddTarget] = useState<{ date: string; slotIdx: number } | null>(null);
  const [addValue, setAddValue] = useState("");
  // Optimis: blok Task pindah hari/jam & Task baru dari quick-add muncul
  // SEKETIKA (bukan nunggu router.refresh() round-trip server) - sama pola
  // dgn PmCalendarView. Drop, ganti durasi, & lepas-jadwal semua lewat
  // scheduleTask yg sama jadi digabung 1 action type "schedule".
  type OptimisticAction =
    | { type: "schedule"; taskId: string; dueDate: string; time: string | null; duration: number | null }
    | { type: "add"; task: PmTimeBoxTaskRow };
  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, (state, action: OptimisticAction) =>
    action.type === "add"
      ? [...state, action.task]
      : state.map((t) =>
          t.id === action.taskId
            ? {
                ...t,
                due_date: action.dueDate,
                scheduled_time: action.time,
                scheduled_duration_minutes: action.duration,
              }
            : t,
        ),
  );

  const today = todayStr();
  const weekStart = weekStartOf(date);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const tasksById = new Map(optimisticTasks.map((t) => [t.id, t]));
  const unscheduled = optimisticTasks.filter(
    (t) => t.due_date && weekDates.includes(t.due_date) && !t.scheduled_time,
  );
  const byDate = new Map<string, PmTimeBoxTaskRow[]>();
  for (const t of optimisticTasks) {
    if (!t.due_date || !weekDates.includes(t.due_date) || !t.scheduled_time) continue;
    const list = byDate.get(t.due_date) ?? [];
    list.push(t);
    byDate.set(t.due_date, list);
  }

  // Proyeksi siklus berulang MASA DEPAN yang jatuh dalam minggu ini -
  // di-scan dari SEMUA Task (bukan cuma yang due_date-nya kebetulan ada di
  // minggu ini), krn pola berulang jalan terus terlepas dari apakah siklus
  // SEBELUMNYA sudah ditandai Done atau belum (mis. Task overdue berbulan-
  // bulan tetap harusnya kelihatan proyeksinya minggu ini). Dibatasi cuma
  // utk Task yang SUDAH berjam (scheduled_time terisi) - Time Box pada
  // dasarnya soal "jam", Task berulang tanpa jam tetap ditangani seperti
  // biasa (tidak diproyeksikan ke grid).
  const virtualByDate = new Map<string, PmTimeBoxVirtualBlock[]>();
  for (const t of optimisticTasks) {
    if (!t.recurrence_type || !t.due_date || !t.scheduled_time) continue;
    const occurrences = projectRecurringOccurrences(
      t.due_date,
      t.recurrence_type as PmRecurrenceType,
      t.recurrence_interval,
      t.recurrence_end_date,
      weekDates[0],
      weekDates[6],
    );
    for (const occurrence of occurrences) {
      const list = virtualByDate.get(occurrence) ?? [];
      list.push({ task: t, date: occurrence });
      virtualByDate.set(occurrence, list);
    }
  }

  function handleDrop(dateStr: string, slotIdx: number) {
    setDragOverCell(null);
    if (!dragTaskId) return;
    const taskId = dragTaskId;
    setDragTaskId(null);
    const existing = tasksById.get(taskId);
    const duration = existing?.scheduled_duration_minutes ?? 60;
    const { hour, minute } = SLOTS[slotIdx];
    const time = `${pad2(hour)}:${pad2(minute)}:00`;
    startTransition(async () => {
      applyOptimistic({ type: "schedule", taskId, dueDate: dateStr, time, duration });
      await scheduleTask(taskId, dateStr, time, duration);
      router.refresh();
    });
  }

  function handleUnschedule(taskId: string, dateStr: string) {
    startTransition(async () => {
      applyOptimistic({ type: "schedule", taskId, dueDate: dateStr, time: null, duration: null });
      await scheduleTask(taskId, dateStr, null, null);
      router.refresh();
    });
  }

  function handleDurationChange(taskId: string, dateStr: string, scheduledTime: string, duration: number) {
    startTransition(async () => {
      applyOptimistic({ type: "schedule", taskId, dueDate: dateStr, time: scheduledTime, duration });
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
    const time = `${pad2(hour)}:${pad2(minute)}:00`;
    setAddValue("");
    setAddTarget(null);
    const tempId = `optimistic-${Date.now()}`;
    startTransition(async () => {
      applyOptimistic({
        type: "add",
        task: {
          id: tempId,
          judul,
          status: "to_do",
          due_date: d,
          scheduled_time: time,
          scheduled_duration_minutes: 60,
          recurrence_type: null,
          recurrence_interval: 1,
          recurrence_end_date: null,
          color: null,
          assignee_ids: assigneeFilterIds ?? [],
        },
      });
      await createTaskQuick(listId, judul, d, time, 60, assigneeFilterIds);
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
            const dayVirtual = virtualByDate.get(d) ?? [];
            // Layout tumpang-tindih dihitung TERPISAH utk blok asli vs blok
            // proyeksi (keduanya sudah beda gaya visual - solid vs dashed -
            // jadi tidak perlu berbagi kolom yang sama; kalau kebetulan jam
            // sama, keduanya tetap saling menutupi apa adanya, kasus jarang
            // yg sengaja tidak ditangani supaya kodenya tidak makin rumit).
            const dayLayout = computeOverlapLayout(
              dayTasks.map((t) => {
                const start = slotIndexFromTime(t.scheduled_time as string);
                const durationSlots = Math.max(
                  1,
                  Math.round((t.scheduled_duration_minutes ?? 60) / SLOT_MINUTES),
                );
                return { id: t.id, start, end: start + durationSlots };
              }),
            );
            const virtualLayout = computeOverlapLayout(
              dayVirtual.map(({ task: t }) => {
                const start = slotIndexFromTime(t.scheduled_time as string);
                const durationSlots = Math.max(
                  1,
                  Math.round((t.scheduled_duration_minutes ?? 60) / SLOT_MINUTES),
                );
                return { id: t.id, start, end: start + durationSlots };
              }),
            );
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
                  const { col, cols } = dayLayout.get(t.id) ?? { col: 0, cols: 1 };
                  const widthPct = 100 / cols;
                  const leftPct = col * widthPct;
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
                      style={{
                        top,
                        height,
                        left: `calc(${leftPct}% + 1px)`,
                        width: `calc(${widthPct}% - 2px)`,
                      }}
                      className={`group absolute cursor-grab overflow-hidden rounded px-1 py-0.5 text-[10px] leading-tight shadow-sm active:cursor-grabbing ${
                        t.color ? TASK_COLOR_FILL_KELAS[t.color] : (TASK_STATUS_BADGE_KELAS[t.status] ?? "bg-zinc-100 text-zinc-600")
                      } ${TASK_STATUS_BORDER_KELAS[t.status] ?? ""}`}
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
                      {t.assignee_ids.length > 0 && (
                        <div className="flex gap-0.5 pr-2.5">
                          {t.assignee_ids.slice(0, 4).map((userId) => {
                            const email = emailByUserId?.[userId];
                            return (
                              <span
                                key={userId}
                                title={email ?? userId}
                                className={`flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full text-[6px] font-bold leading-none text-white ${avatarKelasForUserId(userId)}`}
                              >
                                {(email ?? "?").charAt(0).toUpperCase()}
                              </span>
                            );
                          })}
                          {t.assignee_ids.length > 4 && (
                            <span className="text-[7px] leading-none text-zinc-500">
                              +{t.assignee_ids.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                      <Link
                        href={t.href ?? `${listBase}/${t.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate pr-2.5 hover:underline"
                      >
                        {t.recurrence_type && <span aria-label="Berulang">🔁 </span>}
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

                {dayVirtual.map(({ task: t }) => {
                  const startIdx = slotIndexFromTime(t.scheduled_time as string);
                  const durationSlots = Math.max(
                    1,
                    Math.round((t.scheduled_duration_minutes ?? 60) / SLOT_MINUTES),
                  );
                  const top = startIdx * SLOT_HEIGHT;
                  const height = Math.min(durationSlots * SLOT_HEIGHT, SLOTS.length * SLOT_HEIGHT - top) - 1;
                  const { col, cols } = virtualLayout.get(t.id) ?? { col: 0, cols: 1 };
                  const widthPct = 100 / cols;
                  const leftPct = col * widthPct;
                  return (
                    <Link
                      key={`${t.id}-proj-${d}`}
                      href={t.href ?? `${listBase}/${t.id}`}
                      title="Proyeksi siklus berulang - tandai Done siklus sebelumnya utk menjadwalkan sungguhan di tanggal ini"
                      style={{
                        top,
                        height,
                        left: `calc(${leftPct}% + 1px)`,
                        width: `calc(${widthPct}% - 2px)`,
                      }}
                      className="absolute overflow-hidden rounded border border-dashed border-zinc-300 bg-zinc-50/80 px-1 py-0.5 text-[10px] leading-tight text-zinc-500 opacity-80 hover:opacity-100 hover:underline"
                    >
                      🔁 {t.judul}
                    </Link>
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
