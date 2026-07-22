import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TASK_STATUS_VALUES } from "@/lib/pm/schema";
import { TASK_STATUS_LABEL, TASK_STATUS_BADGE_KELAS } from "@/lib/pm/labels";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { PmBoardView } from "@/components/pm/PmBoardView";
import { PmCalendarView } from "@/components/pm/PmCalendarView";
import { PmTimeBoxView } from "@/components/pm/PmTimeBoxView";
import { PmTaskListInline } from "@/components/pm/PmTaskListInline";
import { getOrCreateInboxListId } from "@/lib/pm/inbox";

type PmWorkspaceMemberProfile = { user_id: string; email: string };
type PmDashboardTask = {
  id: string;
  judul: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  scheduled_time: string | null;
  scheduled_duration_minutes: number | null;
  recurrence_type: string | null;
  assignee_ids: string[];
  // Dipakai buat filter Space/Folder/List berjenjang, bukan ditampilkan
  // langsung - listId khususnya dipakai jg buat kunci `href` di bawah.
  spaceId: string;
  folderId: string | null;
  listId: string;
  // URL Task ini sendiri - beda dari halaman List yang punya 1 listId tetap
  // (jadi 1 base URL berlaku utk semua Task-nya), di sini Task berasal dari
  // banyak List sekaligus jadi tiap Task perlu URL-nya masing-masing.
  // Disematkan sbg data (bukan function) karena PmBoardView/PmTaskListInline
  // "use client" - function dari Server Component tidak bisa lolos RSC
  // boundary ("Functions cannot be passed directly to Client Components").
  href: string;
};
type PmFolderOption = { id: string; nama: string; spaceId: string };
type PmListOption = { id: string; nama: string; spaceId: string; folderId: string | null };

const TAB_VALUES = ["progress", "workload", "resume", "list", "board", "calendar", "timebox"] as const;
type PmDashboardTab = (typeof TAB_VALUES)[number];
const TAB_LABEL: Record<PmDashboardTab, string> = {
  progress: "Progres Task",
  workload: "Workload",
  resume: "Resume",
  list: "List",
  board: "Board",
  calendar: "Calendar",
  timebox: "Time Box",
};

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
  searchParams: Promise<{
    tab?: string;
    month?: string;
    date?: string;
    space?: string;
    folder?: string;
    list?: string;
  }>;
}) {
  const { workspaceId } = await params;
  const {
    tab: tabParam,
    month: monthParam,
    date: dateParam,
    space: spaceFilter,
    folder: folderFilter,
    list: listFilter,
  } = await searchParams;
  const tab: PmDashboardTab = TAB_VALUES.includes(tabParam as PmDashboardTab)
    ? (tabParam as PmDashboardTab)
    : "progress";
  const now = new Date();
  const month =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const date =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Akses modul PM sudah dicek di app/pm/layout.tsx.
  const supabase = await createClient();

  // workspace, pohon Space->Folder/List->Task, dan daftar anggota tidak
  // saling bergantung - digabung paralel. pm_folders & pm_lists sama-sama
  // di-nested langsung di bawah pm_spaces (dua relasi independen, tidak
  // ambigu karena masing-masing FK cuma merujuk 1 tabel) supaya opsi filter
  // Folder/List bisa dibangun tanpa round-trip tambahan.
  const [{ data: workspace }, { data: spaceRows }, { data: anggotaRaw }] = await Promise.all([
    supabase.from("pm_workspaces").select("id, nama").eq("id", workspaceId).single(),
    supabase
      .from("pm_spaces")
      .select(
        "id, nama, pm_folders(id, nama), pm_lists(id, nama, folder_id, pm_tasks(id, judul, status, priority, due_date, scheduled_time, scheduled_duration_minutes, recurrence_type, pm_task_assignees(user_id)))",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
    supabase.rpc("pm_workspace_member_profiles", { p_workspace_id: workspaceId }),
  ]);

  if (!workspace) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Workspace tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  type SpaceTree = {
    id: string;
    nama: string;
    pm_folders: { id: string; nama: string }[];
    pm_lists: {
      id: string;
      nama: string;
      folder_id: string | null;
      pm_tasks: (Omit<
        PmDashboardTask,
        "assignee_ids" | "href" | "spaceId" | "folderId" | "listId"
      > & {
        pm_task_assignees: { user_id: string }[];
      })[];
    }[];
  };
  const spaceTree = (spaceRows ?? []) as unknown as SpaceTree[];

  const spaces = spaceTree.map((s) => ({ id: s.id, nama: s.nama }));
  const folders: PmFolderOption[] = spaceTree.flatMap((s) =>
    s.pm_folders.map((f) => ({ id: f.id, nama: f.nama, spaceId: s.id })),
  );
  const lists: PmListOption[] = spaceTree.flatMap((s) =>
    s.pm_lists.map((l) => ({ id: l.id, nama: l.nama, spaceId: s.id, folderId: l.folder_id })),
  );

  const allTasks: PmDashboardTask[] = spaceTree.flatMap((space) =>
    space.pm_lists.flatMap((list) =>
      list.pm_tasks.map((t) => ({
        ...t,
        assignee_ids: t.pm_task_assignees.map((a) => a.user_id),
        spaceId: space.id,
        folderId: list.folder_id,
        listId: list.id,
        href: `/pm/${workspaceId}/${space.id}/${list.id}/${t.id}`,
      })),
    ),
  );

  // Filter berjenjang Space -> Folder -> List: makin spesifik makin
  // menang - pilih List = cuma Task List itu, pilih Folder = seluruh List di
  // Folder itu, pilih Space (tanpa Folder/List) = seluruh Task di Space itu.
  // "folder=none" khusus mewakili List yang langsung di bawah Space (di
  // luar Folder manapun), beda dari folder tidak dipilih sama sekali.
  const tasks = listFilter
    ? allTasks.filter((t) => t.listId === listFilter)
    : folderFilter === "none"
      ? allTasks.filter((t) => t.spaceId === spaceFilter && t.folderId === null)
      : folderFilter
        ? allTasks.filter((t) => t.folderId === folderFilter)
        : spaceFilter
          ? allTasks.filter((t) => t.spaceId === spaceFilter)
          : allTasks;

  // Tab Time Box tanpa filter List spesifik: quick-add tetap aktif (susulan
  // permintaan user - "task bisa ditambahkan tanpa mengalokasikan folder/
  // list terlebih dahulu"), diarahkan ke List "Inbox" per Workspace
  // (di-provision lazy kalau belum ada - lihat lib/pm/inbox.ts). Cuma
  // di-query saat genuinely dibutuhkan (tab timebox & belum ada listFilter)
  // supaya tab lain tidak kena efek samping insert Inbox.
  const inboxListId =
    tab === "timebox" && !listFilter ? await getOrCreateInboxListId(supabase, workspaceId) : null;

  // Opsi dropdown Folder/List di-scope ke Space/Folder yang sudah dipilih -
  // form submit ulang tiap "Terapkan" (pola sama seperti filter halaman
  // List), bukan cascading live lewat JS.
  const folderOptions = spaceFilter ? folders.filter((f) => f.spaceId === spaceFilter) : [];
  const listOptions = folderFilter
    ? folderFilter === "none"
      ? lists.filter((l) => l.spaceId === spaceFilter && l.folderId === null)
      : lists.filter((l) => l.folderId === folderFilter)
    : spaceFilter
      ? lists.filter((l) => l.spaceId === spaceFilter)
      : lists;

  const anggota = (anggotaRaw ?? []) as PmWorkspaceMemberProfile[];
  const emailByUserId = new Map(anggota.map((a) => [a.user_id, a.email]));
  const emailByUserIdRecord = Object.fromEntries(emailByUserId);

  const dashboardBase = `/pm/${workspaceId}/dashboard`;
  // Dibawa serta di semua Link (switch tab, nav bulan Calendar) supaya
  // filter Space/Folder/List yang aktif tidak hilang pas pindah tab.
  const filterQuery: Record<string, string> = {
    ...(spaceFilter ? { space: spaceFilter } : {}),
    ...(folderFilter ? { folder: folderFilter } : {}),
    ...(listFilter ? { list: listFilter } : {}),
  };

  return (
    <FormPageShell maxWidth="max-w-4xl">
      <FormPageHeader
        title="Dashboard"
        subtitle={workspace.nama}
        backHref={`/pm/${workspaceId}`}
        backLabel="Kembali ke Workspace"
      />

      <div className="inline-flex flex-wrap rounded-full bg-zinc-100 p-1">
        {TAB_VALUES.map((value) => (
          <Link
            key={value}
            href={{
              pathname: dashboardBase,
              query: {
                ...filterQuery,
                tab: value,
                ...(value === "calendar" ? { month } : {}),
                ...(value === "timebox" ? { date } : {}),
              },
            }}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              tab === value ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            {TAB_LABEL[value]}
          </Link>
        ))}
      </div>

      <form className="mt-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="tab" value={tab} />
        {tab === "calendar" && <input type="hidden" name="month" value={month} />}
        {tab === "timebox" && <input type="hidden" name="date" value={date} />}
        <select
          name="space"
          defaultValue={spaceFilter ?? ""}
          className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-[13px] text-zinc-700 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="">Semua Space</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama}
            </option>
          ))}
        </select>
        <select
          name="folder"
          defaultValue={folderFilter ?? ""}
          disabled={!spaceFilter}
          className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-[13px] text-zinc-700 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:text-zinc-300"
        >
          <option value="">{spaceFilter ? "Semua Folder" : "- Pilih Space dulu -"}</option>
          {spaceFilter && <option value="none">Tanpa Folder (langsung di Space)</option>}
          {folderOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nama}
            </option>
          ))}
        </select>
        <select
          name="list"
          defaultValue={listFilter ?? ""}
          disabled={!spaceFilter}
          className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-[13px] text-zinc-700 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:text-zinc-300"
        >
          <option value="">{spaceFilter ? "Semua List" : "- Pilih Space dulu -"}</option>
          {listOptions.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nama}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-zinc-900 px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Terapkan
        </button>
        {(spaceFilter || folderFilter || listFilter) && (
          <Link
            href={{
              pathname: dashboardBase,
              query: { tab, ...(tab === "calendar" ? { month } : {}) },
            }}
            className="text-[13px] text-zinc-400 transition-colors hover:text-zinc-700"
          >
            Reset filter
          </Link>
        )}
      </form>

      <div className="mt-6">
        {tab === "progress" && <ProgresTaskTab tasks={tasks} />}
        {tab === "workload" && (
          <WorkloadTab tasks={tasks} anggota={anggota} emailByUserId={emailByUserId} />
        )}
        {tab === "resume" && <ResumeTab tasks={tasks} />}
        {tab === "list" && (
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-400">
                    <th className="px-4 py-2 font-medium">Task</th>
                    <th className="px-2 py-2 font-medium">Assignee</th>
                    <th className="px-2 py-2 font-medium">Due Date</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Priority</th>
                  </tr>
                </thead>
                <PmTaskListInline
                  tasks={tasks}
                  emailByUserId={emailByUserIdRecord}
                  listBase={dashboardBase}
                  statusLabels={TASK_STATUS_LABEL}
                />
              </table>
            </div>
          </div>
        )}
        {tab === "board" && (
          <PmBoardView
            tasks={tasks}
            emailByUserId={emailByUserIdRecord}
            listBase={dashboardBase}
            statusLabels={TASK_STATUS_LABEL}
          />
        )}
        {tab === "calendar" && (
          <>
            {!listFilter && (
              <p className="mb-3 text-[12px] text-zinc-400">
                Pilih List spesifik lewat filter di atas (Terapkan) utk bisa menambahkan Task lewat
                klik tanggal - Task baru butuh List tujuan yang jelas, jadi tidak aktif selama masih
                menampilkan gabungan beberapa List.
              </p>
            )}
            <PmCalendarView
              tasks={tasks}
              listBase={dashboardBase}
              month={month}
              baseQuery={filterQuery}
              viewParamKey="tab"
              listId={listFilter}
            />
          </>
        )}
        {tab === "timebox" && (
          <>
            {!listFilter && (
              <p className="mb-3 text-[12px] text-zinc-400">
                Task baru lewat klik slot jam di sini masuk ke List &ldquo;Inbox&rdquo; (dibuat
                otomatis) krn belum difilter ke List tertentu - pindahkan ke List yang sesuai
                belakangan lewat &ldquo;Pindahkan ke List&rdquo; di Task Detail.
              </p>
            )}
            <PmTimeBoxView
              tasks={tasks}
              listBase={dashboardBase}
              date={date}
              baseQuery={filterQuery}
              viewParamKey="tab"
              listId={listFilter ?? inboxListId ?? undefined}
            />
          </>
        )}
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
  const unassignedCount = tasks.filter((t) => t.assignee_ids.length === 0).length;
  const maxCount = Math.max(
    1,
    ...anggota.map((a) => tasks.filter((t) => t.assignee_ids.includes(a.user_id)).length),
  );

  return (
    <div className="rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
      <div className="space-y-3">
        {anggota.map((a) => {
          const count = tasks.filter((t) => t.assignee_ids.includes(a.user_id)).length;
          const notDone = tasks.filter(
            (t) => t.assignee_ids.includes(a.user_id) && t.status !== "done",
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
