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
import { FormField } from "@/components/ui/FormField";
import { PmEntityGrid } from "@/components/pm/PmEntityGrid";

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

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <h2 className="text-[15px] font-semibold text-zinc-900">Space</h2>
      <div className="mt-3">
        <PmEntityGrid
          items={spaces ?? []}
          hrefBase={(id) => `/pm/${workspaceId}/${id}`}
          emptyLabel="Belum ada Space."
        />
      </div>

      <div className="mt-6 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Buat Space baru</h3>
        <form action={createSpace} className="mt-4 grid grid-cols-1 gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <FormField label="Nama Space" name="nama" />
          <button
            type="submit"
            className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Buat Space
          </button>
        </form>
      </div>

      <div className="mt-10 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Anggota Workspace</h3>
        <ul className="mt-4 space-y-2">
          {anggotaWorkspace.map((a) => (
            <li
              key={a.user_id}
              className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-2.5 text-[14px] text-zinc-700"
            >
              {a.email}
              {pmRole === "admin" && (
                <form action={removeWorkspaceMember}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="userId" value={a.user_id} />
                  <button
                    type="submit"
                    className="text-[13px] text-zinc-400 transition-colors hover:text-red-600"
                  >
                    Keluarkan
                  </button>
                </form>
              )}
            </li>
          ))}
          {anggotaWorkspace.length === 0 && (
            <li className="text-[14px] text-zinc-400">Belum ada anggota.</li>
          )}
        </ul>

        {pmRole === "admin" && kandidatAnggota.length > 0 && (
          <form action={addWorkspaceMember} className="mt-4 flex items-center gap-3">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <select
              name="userId"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            >
              {kandidatAnggota.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.email}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Tambah ke Workspace
            </button>
          </form>
        )}
      </div>

      {pmRole === "admin" && (
        <div className="mt-10 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
          <h3 className="text-[14px] font-semibold text-zinc-900">Pengaturan Workspace</h3>
          <form action={renameWorkspace} className="mt-4 grid grid-cols-1 gap-4">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <FormField label="Nama Workspace" name="nama" defaultValue={workspace.nama} />
            <div>
              <label className="block text-[13px] font-medium text-zinc-500">
                Deskripsi (opsional)
              </label>
              <textarea
                name="deskripsi"
                rows={2}
                defaultValue={workspace.deskripsi ?? ""}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none transition-all duration-150 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <button
              type="submit"
              className="w-fit rounded-full bg-zinc-100 px-5 py-2.5 text-[14px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
            >
              Simpan Perubahan
            </button>
          </form>

          <form action={deleteWorkspace} className="mt-4">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <button
              type="submit"
              className="text-[13px] font-medium text-red-500 transition-colors hover:text-red-700"
            >
              Hapus Workspace ini
            </button>
          </form>
        </div>
      )}
    </FormPageShell>
  );
}
