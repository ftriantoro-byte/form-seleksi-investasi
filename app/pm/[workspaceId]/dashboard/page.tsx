import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TASK_STATUS_VALUES } from "@/lib/pm/schema";
import { TASK_STATUS_LABEL, TASK_STATUS_BADGE_KELAS } from "@/lib/pm/labels";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";

type PmWorkspaceMemberProfile = { user_id: string; email: string };
type PmDashboardTask = {
  id: string;
  status: string;
  due_date: string | null;
  assignee_id: string | null;
};

const TAB_VALUES = ["progress", "workload", "resume"] as const;
type PmDashboardTab = (typeof TAB_VALUES)[number];

// Dashboard di-scope per Workspace (bukan gabungan semua Workspace) - selaras
// dengan cara sidebar & breadcrumb sudah dipakai. Label status di sini
// SENGAJA pakai default TASK_STATUS_LABEL (bukan custom_status_labels per
// List dari B.6) - Task di dashboard ini berasal dari banyak List sekaligus,
// yang masing-masing bisa punya label kustom berbeda untuk key status yang
// sama, jadi label tunggal per key lebih masuk akal untuk tampilan agregat.
export default async function PmWorkspaceDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { workspaceId } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: PmDashboardTab = TAB_VALUES.includes(tabParam as PmDashboardTab)
    ? (tabParam as PmDashboardTab)
    : "progress";

  // Akses modul PM sudah dicek di app/pm/layout.tsx.
  const supabase = await createClient();

  const { data: workspace } = await supabase
    .from("pm_workspaces")
    .select("id, nama")
    .eq("id", workspaceId)
    .single();

  if (!workspace) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Workspace tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  const { data: spaceRows } = await supabase
    .from("pm_spaces")
    .select("id")
    .eq("workspace_id", workspaceId);
  const spaceIds = (spaceRows ?? []).map((s) => s.id);

  let listIds: string[] = [];
  if (spaceIds.length > 0) {
    const { data: listRows } = await supabase.from("pm_lists").select("id").in("space_id", spaceIds);
    listIds = (listRows ?? []).map((l) => l.id);
  }

  let tasks: PmDashboardTask[] = [];
  if (listIds.length > 0) {
    const { data: taskRows } = await supabase
      .from("pm_tasks")
      .select("id, status, due_date, assignee_id")
      .in("list_id", listIds);
    tasks = (taskRows ?? []) as PmDashboardTask[];
  }

  const { data: anggotaRaw } = await supabase.rpc("pm_workspace_member_profiles", {
    p_workspace_id: workspaceId,
  });
  const anggota = (anggotaRaw ?? []) as PmWorkspaceMemberProfile[];
  const emailByUserId = new Map(anggota.map((a) => [a.user_id, a.email]));

  const dashboardBase = `/pm/${workspaceId}/dashboard`;

  return (
    <FormPageShell maxWidth="max-w-4xl">
      <FormPageHeader
        title="Dashboard"
        subtitle={workspace.nama}
        backHref={`/pm/${workspaceId}`}
        backLabel="Kembali ke Workspace"
      />

      <div className="inline-flex rounded-full bg-zinc-100 p-1">
        {TAB_VALUES.map((value) => (
          <Link
            key={value}
            href={{ pathname: dashboardBase, query: { tab: value } }}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium capitalize transition-colors duration-150 ${
              tab === value ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            {value === "progress" ? "Progres Task" : value === "workload" ? "Workload" : "Resume"}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {tab === "progress" && <ProgresTaskTab tasks={tasks} />}
        {tab === "workload" && (
          <WorkloadTab tasks={tasks} anggota={anggota} emailByUserId={emailByUserId} />
        )}
        {tab === "resume" && <ResumeTab tasks={tasks} />}
      </div>
    </FormPageShell>
  );
}

function ProgresTaskTab({ tasks }: { tasks: PmDashboardTask[] }) {
  const total = tasks.length;

  return (
    <div className="rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
      <p className="text-[13px] text-zinc-400">Total {total} Task di Workspace ini.</p>

      {total > 0 && (
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-zinc-100">
          {TASK_STATUS_VALUES.map((status) => {
            const count = tasks.filter((t) => t.status === status).length;
            const pct = (count / total) * 100;
            if (pct === 0) return null;
            const barKelas = (TASK_STATUS_BADGE_KELAS[status] ?? "bg-zinc-300").split(" ")[0];
            return <div key={status} className={barKelas} style={{ width: `${pct}%` }} />;
          })}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {TASK_STATUS_VALUES.map((status) => {
          const count = tasks.filter((t) => t.status === status).length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={status} className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-[22px] font-semibold text-zinc-900">{count}</div>
              <div className="mt-0.5 text-[12px] text-zinc-500">{TASK_STATUS_LABEL[status]}</div>
              <div className="mt-1 text-[11px] text-zinc-400">{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkloadTab({
  tasks,
  anggota,
  emailByUserId,
}: {
  tasks: PmDashboardTask[];
  anggota: PmWorkspaceMemberProfile[];
  emailByUserId: Map<string, string>;
}) {
  const unassignedCount = tasks.filter((t) => !t.assignee_id).length;
  const maxCount = Math.max(1, ...anggota.map((a) => tasks.filter((t) => t.assignee_id === a.user_id).length));

  return (
    <div className="rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
      <div className="space-y-3">
        {anggota.map((a) => {
          const count = tasks.filter((t) => t.assignee_id === a.user_id).length;
          const notDone = tasks.filter(
            (t) => t.assignee_id === a.user_id && t.status !== "done",
          ).length;
          return (
            <div key={a.user_id}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-zinc-700">{emailByUserId.get(a.user_id) ?? a.email}</span>
                <span className="text-zinc-400">
                  {count} Task ({notDone} belum selesai)
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-zinc-900"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
        {anggota.length === 0 && (
          <p className="text-[14px] text-zinc-400">Belum ada anggota Workspace.</p>
        )}
      </div>

      {unassignedCount > 0 && (
        <p className="mt-4 text-[13px] text-zinc-400">
          {unassignedCount} Task belum ada assignee.
        </p>
      )}
    </div>
  );
}

function ResumeTab({ tasks }: { tasks: PmDashboardTask[] }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const selesai = tasks.filter((t) => t.status === "done").length;
  const terlambat = tasks.filter(
    (t) => t.status !== "done" && t.due_date !== null && t.due_date < todayStr,
  ).length;
  const onSchedule = tasks.filter(
    (t) => t.status !== "done" && t.due_date !== null && t.due_date >= todayStr,
  ).length;
  const tanpaDueDate = tasks.filter((t) => t.status !== "done" && t.due_date === null).length;

  const tiles = [
    { label: "Selesai", value: selesai, kelas: "bg-emerald-50 text-emerald-700" },
    { label: "Terlambat", value: terlambat, kelas: "bg-red-50 text-red-700" },
    { label: "Sesuai Jadwal", value: onSchedule, kelas: "bg-blue-50 text-blue-700" },
    { label: "Tanpa Due Date", value: tanpaDueDate, kelas: "bg-zinc-100 text-zinc-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className={`rounded-2xl p-5 ${tile.kelas}`}>
          <div className="text-[26px] font-semibold">{tile.value}</div>
          <div className="mt-1 text-[13px]">{tile.label}</div>
        </div>
      ))}
    </div>
  );
}
