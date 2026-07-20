import Link from "next/link";
import "./pm.css";
import { logout } from "@/actions/auth";
import { getPmMobileMode } from "@/lib/pm/preferences";
import { createClient } from "@/lib/supabase/server";
import { PmSidebar } from "@/components/pm/PmSidebar";
import { PmModeToggle } from "@/components/pm/PmModeToggle";
import { PmNotificationBell } from "@/components/pm/PmNotificationBell";
import { PmCommandPalette } from "@/components/pm/PmCommandPalette";
import { FormPageShell } from "@/components/ui/FormPageShell";

type PmList = { id: string; nama: string };
type PmFolder = { id: string; nama: string; lists: PmList[] };
type PmSpace = { id: string; nama: string; folders: PmFolder[]; lists: PmList[] };
type PmWorkspace = { id: string; nama: string; spaces: PmSpace[] };

export default async function PmLayout({ children }: { children: React.ReactNode }) {
  // getUser() dipanggil SEKALI di sini (bukan lewat getPmMembership() yang
  // manggil lagi secara terpisah) - layout ini jalan di SETIAP navigasi/
  // router.refresh() di seluruh modul PM, jadi memangkas 1 auth round-trip
  // di sini kerasa dampaknya lintas semua halaman, bukan cuma satu.
  const mobileMode = await getPmMobileMode();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Anda tidak memiliki akses ke modul Manajemen Proyek.
        </p>
      </FormPageShell>
    );
  }

  const [{ data: memberRow }, { count: unreadCount }] = await Promise.all([
    supabase.from("pm_members").select("role").eq("user_id", user.id).single(),
    supabase
      .from("pm_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("dibaca", false),
  ]);

  if (!memberRow?.role) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Anda tidak memiliki akses ke modul Manajemen Proyek.
        </p>
      </FormPageShell>
    );
  }

  if (mobileMode) {
    return (
      <div className="pm-app min-h-screen bg-[#fbfbfd]">
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.04] bg-white px-4 py-2.5 sm:px-6">
          {user?.email && <span className="truncate text-[12px] text-zinc-400">{user.email}</span>}
          <div className="ml-auto flex items-center gap-2.5">
            <Link
              href="/"
              className="rounded-full bg-zinc-100 px-4 py-1.5 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
            >
              &larr; Beranda
            </Link>
            <PmCommandPalette />
            <PmNotificationBell unreadCount={unreadCount ?? 0} />
            <Link
              href="/akun"
              className="rounded-full bg-zinc-100 px-4 py-1.5 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
            >
              Akun
            </Link>
            <PmModeToggle mobileMode={mobileMode} />
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full bg-zinc-900 px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
        {children}
      </div>
    );
  }

  // Workspace+Space digabung jadi SATU query lewat nested select PostgREST
  // (tidak ambigu - pm_spaces cuma py 1 FK ke pm_workspaces) supaya cuma 1
  // round-trip, bukan 2 berurutan. Folder+List TETAP 2 query terpisah
  // (bukan nested) karena pm_lists punya DUA FK (space_id, folder_id) -
  // filter "List langsung di Space vs di dalam Folder" lebih jelas dirakit
  // di sini daripada lewat sintaks embedded select yang butuh disambiguasi.
  const { data: workspacesRaw } = await supabase
    .from("pm_workspaces")
    .select("id, nama, pm_spaces(id, nama, workspace_id)")
    .order("created_at", { ascending: true })
    .order("created_at", { referencedTable: "pm_spaces", ascending: true });

  const workspaceRows = (workspacesRaw ?? []) as {
    id: string;
    nama: string;
    pm_spaces: { id: string; nama: string; workspace_id: string }[];
  }[];
  const spaceRows = workspaceRows.flatMap((w) => w.pm_spaces ?? []);
  const spaceIds = spaceRows.map((s) => s.id);

  let folderRows: { id: string; nama: string; space_id: string }[] = [];
  let listRows: { id: string; nama: string; space_id: string; folder_id: string | null }[] = [];

  if (spaceIds.length > 0) {
    const [{ data: foldersRaw }, { data: listsRaw }] = await Promise.all([
      supabase
        .from("pm_folders")
        .select("id, nama, space_id")
        .in("space_id", spaceIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("pm_lists")
        .select("id, nama, space_id, folder_id")
        .in("space_id", spaceIds)
        .order("urutan", { ascending: true }),
    ]);
    folderRows = foldersRaw ?? [];
    listRows = listsRaw ?? [];
  }

  const workspaces: PmWorkspace[] = workspaceRows.map((ws) => ({
    id: ws.id,
    nama: ws.nama,
    spaces: spaceRows
      .filter((s) => s.workspace_id === ws.id)
      .map((s) => ({
        id: s.id,
        nama: s.nama,
        folders: folderRows
          .filter((f) => f.space_id === s.id)
          .map((f) => ({
            id: f.id,
            nama: f.nama,
            lists: listRows
              .filter((l) => l.folder_id === f.id)
              .map((l) => ({ id: l.id, nama: l.nama })),
          })),
        lists: listRows
          .filter((l) => l.space_id === s.id && !l.folder_id)
          .map((l) => ({ id: l.id, nama: l.nama })),
      })),
  }));

  return (
    <div className="pm-app flex min-h-screen bg-[#fbfbfd]">
      <PmSidebar workspaces={workspaces} />
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.04] bg-white px-6 py-2.5 sm:px-10">
          {user?.email && <span className="truncate text-[12px] text-zinc-400">{user.email}</span>}
          <div className="ml-auto flex items-center gap-2.5">
            <Link
              href="/"
              className="rounded-full bg-zinc-100 px-4 py-1.5 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
            >
              &larr; Beranda
            </Link>
            <PmCommandPalette />
            <PmNotificationBell unreadCount={unreadCount ?? 0} />
            <Link
              href="/akun"
              className="rounded-full bg-zinc-100 px-4 py-1.5 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
            >
              Akun
            </Link>
            <PmModeToggle mobileMode={mobileMode} />
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full bg-zinc-900 px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
