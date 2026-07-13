import Link from "next/link";
import { TASK_STATUS_BADGE_KELAS } from "@/lib/pm/labels";

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
}) {
  const [year, monthNum] = month.split("-").map(Number);
  const firstOfMonth = new Date(year, monthNum - 1, 1);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const tasksByDate = new Map<string, PmCalendarTaskRow[]>();
  for (const t of tasks) {
    if (!t.due_date) continue;
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
          return (
            <div
              key={dateStr}
              className="min-h-[84px] rounded-xl border border-black/[0.04] bg-white p-1.5"
            >
              <div
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  isToday ? "bg-blue-600 font-semibold text-white" : "text-zinc-400"
                }`}
              >
                {day}
              </div>
              <div className="mt-1 space-y-1">
                {dayTasks.slice(0, 3).map((t) => (
                  <Link
                    key={t.id}
                    href={t.href ?? `${listBase}/${t.id}`}
                    className={`block truncate rounded px-1 py-0.5 text-[10px] ${
                      TASK_STATUS_BADGE_KELAS[t.status] ?? "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {t.judul}
                  </Link>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-zinc-400">+{dayTasks.length - 3} lagi</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
