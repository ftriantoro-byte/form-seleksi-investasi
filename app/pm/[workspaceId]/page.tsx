import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPmMembership } from "@/lib/pm/access";
import {
  renameWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
} from "@/actions/pm/workspaces";
import { createSpace } from "@/actions/pm/spaces";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { PmEntityGrid } from "@/components/pm/PmEntityGrid";
import { PmQuickAddForm } from "@/components/pm/PmQuickAddForm";

type PmWorkspaceMemberProfile = { user_id: string; email: string };
type PmMemberProfile = { user_id: string; email: string; role: "admin" | "member" };

export default async function WorkspaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspaceId } = await params;
  const { error } = await searchParams;
  // Akses modul PM sudah dicek di app/pm/layout.tsx - pmRole di sini pasti terisi.
  const pmRole = await getPmMembership();

  const supabase = await createClient();

  const { data: workspace } = await supabase
    .from("pm_workspaces")
    .select("id, nama, deskripsi")
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

  const [{ data: spaces }, { data: anggotaWorkspaceRaw }, { data: semuaAnggotaPmRaw }] =
    await Promise.all([
      supabase
        .from("pm_spaces")
        .select("id, nama, deskripsi")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true }),
      supabase.rpc("pm_workspace_member_profiles", { p_workspace_id: workspaceId }),
      pmRole === "admin"
        ? supabase.rpc("pm_member_profiles")
        : Promise.resolve({ data: null }),
    ]);

  const anggotaWorkspace = (anggotaWorkspaceRaw ?? []) as PmWorkspaceMemberProfile[];
  const semuaAnggotaPm = (semuaAnggotaPmRaw ?? []) as PmMemberProfile[];

  const idAnggotaWorkspace = new Set(anggotaWorkspace.map((a) => a.user_id));
  const kandidatAnggota = semuaAnggotaPm.filter((a) => !idAnggotaWorkspace.has(a.user_id));

  return (
    <FormPageShell maxWidth="max-w-4xl">
      <FormPageHeader
        title={workspace.nama}
        subtitle={workspace.deskripsi ?? undefined}
        backHref="/pm"
        backLabel="Semua Workspace"
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Link
          href={`/pm/${workspaceId}/dashboard`}
          className="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
        >
          📊 Dashboard
        </Link>
        <Link
          href={`/pm/${workspaceId}/templates`}
          className="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
        >
          💾 Template
        </Link>
        <Link
          href={`/pm/${workspaceId}/meetings`}
          className="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
        >
          📝 Meeting
        </Link>

        <details className="group relative">
          <summary className="cursor-pointer list-none rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200">
            👥 Anggota
          </summary>
          <div className="absolute right-0 top-full z-20 mt-2 w-72 max-w-[90vw] rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl">
            <ul className="space-y-1.5">
              {anggotaWorkspace.map((a) => (
                <li
                  key={a.user_id}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5 text-[13px] text-zinc-700"
                >
                  <span className="truncate">{a.email}</span>
                  {pmRole === "admin" && (
                    <form action={removeWorkspaceMember}>
                      <input type="hidden" name="workspaceId" value={workspaceId} />
                      <input type="hidden" name="userId" value={a.user_id} />
                      <button
                        type="submit"
                        className="shrink-0 text-[11px] text-zinc-400 hover:text-red-600"
                      >
                        Keluarkan
                      </button>
                    </form>
                  )}
                </li>
              ))}
              {anggotaWorkspace.length === 0 && (
                <li className="text-[12px] text-zinc-400">Belum ada anggota.</li>
              )}
            </ul>

            {pmRole === "admin" && kandidatAnggota.length > 0 && (
              <form action={addWorkspaceMember} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <select
                  name="userId"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                >
                  {kandidatAnggota.map((a) => (
                    <option key={a.user_id} value={a.user_id}>
                      {a.email}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-zinc-700"
                >
                  Tambah
                </button>
              </form>
            )}
          </div>
        </details>

        {pmRole === "admin" && (
          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200">
              ⚙️ Pengaturan
            </summary>
            <div className="absolute right-0 top-full z-20 mt-2 w-72 max-w-[90vw] rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl">
              <form action={renameWorkspace} className="grid grid-cols-1 gap-2">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <label className="block text-[11px] font-medium text-zinc-500">Nama Workspace</label>
                <input
                  name="nama"
                  defaultValue={workspace.nama}
                  required
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                />
                <label className="block text-[11px] font-medium text-zinc-500">
                  Deskripsi (opsional)
                </label>
                <textarea
                  name="deskripsi"
                  rows={2}
                  defaultValue={workspace.deskripsi ?? ""}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                />
                <button
                  type="submit"
                  className="w-fit rounded-full bg-zinc-100 px-4 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200"
                >
                  Simpan Perubahan
                </button>
              </form>
              <form action={deleteWorkspace} className="mt-2 border-t border-zinc-100 pt-2">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <button
                  type="submit"
                  className="text-[12px] font-medium text-red-500 hover:text-red-700"
                >
                  Hapus Workspace ini
                </button>
              </form>
            </div>
          </details>
        )}
      </div>

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <h2 className="text-[15px] font-semibold text-zinc-900">Space</h2>
      <div className="mt-3">
        <PmQuickAddForm
          action={createSpace}
          hiddenFields={{ workspaceId }}
          placeholder="Buat Space baru..."
          submitLabel="Buat"
          primary
        />
        <PmEntityGrid
          items={spaces ?? []}
          hrefBase={(id) => `/pm/${workspaceId}/${id}`}
          emptyLabel="Belum ada Space."
        />
      </div>
    </FormPageShell>
  );
}
