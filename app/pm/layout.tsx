import Link from "next/link";
import { logout } from "@/actions/auth";
import { getPmMembership } from "@/lib/pm/access";
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
  const pmRole = await getPmMembership();

  if (!pmRole) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Anda tidak memiliki akses ke modul Manajemen Proyek.
        </p>
      </FormPageShell>
    );
  }

  const mobileMode = await getPmMobileMode();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: unreadCount } = user
    ? await supabase
        .from("pm_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("dibaca", false)
    : { count: 0 };

  if (mobileMode) {
    return (
      <div className="min-h-screen bg-[#fbfbfd]">
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.04] bg-white px-4 py-2.5 sm:px-6">
          {user?.email && <span className="truncate text-[12px] text-zinc-400">{user.email}</span>}
          <div className="ml-auto flex items-center gap-2.5">
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

  // Diambil sebagai 4 query datar (bukan nested select) - pm_lists punya DUA
  // FK (space_id, folder_id) sehingga filter "List langsung di Space vs di
  // dalam Folder" lebih jelas dirakit di sini daripada lewat sintaks embedded
  // select PostgREST. Wajar untuk skala ~3 orang (jumlah baris kecil).
  const { data: workspacesRaw } = await supabase
    .from("pm_workspaces")
    .select("id, nama")
    .order("created_at", { ascending: true });
  const workspaceRows = workspacesRaw ?? [];
  const workspaceIds = workspaceRows.map((w) => w.id);

  let spaceRows: { id: string; nama: string; workspace_id: string }[] = [];
  let folderRows: { id: string; nama: string; space_id: string }[] = [];
  let listRows: { id: string; nama: string; space_id: string; folder_id: string | null }[] = [];

  if (workspaceIds.length > 0) {
    const { data: spacesRaw } = await supabase
      .from("pm_spaces")
      .select("id, nama, workspace_id")
      .in("workspace_id", workspaceIds)
      .order("created_at", { ascending: true });
    spaceRows = spacesRaw ?? [];
    const spaceIds = spaceRows.map((s) => s.id);

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
    <div className="flex min-h-screen bg-[#fbfbfd]">
      <PmSidebar workspaces={workspaces} />
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.04] bg-white px-6 py-2.5 sm:px-10">
          {user?.email && <span className="truncate text-[12px] text-zinc-400">{user.email}</span>}
          <div className="ml-auto flex items-center gap-2.5">
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
