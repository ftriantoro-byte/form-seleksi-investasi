import Link from "next/link";
import { TASK_STATUS_BADGE_KELAS } from "@/lib/pm/labels";

type PmGanttTaskRow = {
  id: string;
  judul: string;
  status: string;
  start_date: string | null;
  due_date: string | null;
};

// Gantt sengaja tampilan sederhana (batang horizontal proporsional terhadap
// rentang tanggal, tanpa drag-resize dan tanpa garis panah dependency -
// dependency ditampilkan sebagai daftar teks di Task Detail, bukan digambar
// di sini, supaya tidak perlu routing SVG antar batang yang posisinya dinamis).
export function PmGanttView({ tasks, listBase }: { tasks: PmGanttTaskRow[]; listBase: string }) {
  const scheduled = tasks.filter((t) => t.due_date);

  if (scheduled.length === 0) {
    return (
      <p className="text-[14px] text-zinc-400">
        Belum ada Task dengan Due Date untuk ditampilkan di Gantt.
      </p>
    );
  }

  const times = scheduled.flatMap((t) => [
    new Date(t.start_date ?? t.due_date!).getTime(),
    new Date(t.due_date!).getTime(),
  ]);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const rangeMs = Math.max(maxTime - minTime, 1000 * 60 * 60 * 24);
  const unscheduledCount = tasks.length - scheduled.length;

  return (
    <div>
      <div className="overflow-x-auto rounded-3xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="min-w-[560px] space-y-2.5">
          {scheduled.map((t) => {
            const start = new Date(t.start_date ?? t.due_date!).getTime();
            const end = new Date(t.due_date!).getTime();
            const leftPct = ((start - minTime) / rangeMs) * 100;
            const widthPct = Math.max(((end - start) / rangeMs) * 100, 1.5);
            const barKelas = (TASK_STATUS_BADGE_KELAS[t.status] ?? "bg-zinc-300").split(" ")[0];

            return (
              <div key={t.id} className="flex items-center gap-3">
                <Link
                  href={`${listBase}/${t.id}`}
                  className="w-40 shrink-0 truncate text-[13px] text-zinc-700 hover:underline"
                >
                  {t.judul}
                </Link>
                <div className="relative h-6 flex-1 rounded-full bg-zinc-100">
                  <div
                    className={`absolute top-0 h-full rounded-full ${barKelas}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {unscheduledCount > 0 && (
        <p className="mt-3 text-[13px] text-zinc-400">
          {unscheduledCount} Task tanpa Due Date tidak ditampilkan di Gantt.
        </p>
      )}
    </div>
  );
}
