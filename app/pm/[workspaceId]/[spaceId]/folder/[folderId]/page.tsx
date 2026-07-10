import { createClient } from "@/lib/supabase/server";
import { renameFolder, deleteFolder } from "@/actions/pm/folders";
import { createList } from "@/actions/pm/lists";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { FormField } from "@/components/ui/FormField";
import { PmEntityGrid } from "@/components/pm/PmEntityGrid";

export default async function FolderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; spaceId: string; folderId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspaceId, spaceId, folderId } = await params;
  const { error } = await searchParams;
  // Akses modul PM sudah dicek di app/pm/layout.tsx.
  const supabase = await createClient();

  const { data: folder } = await supabase
    .from("pm_folders")
    .select("id, nama, deskripsi, space_id")
    .eq("id", folderId)
    .single();

  if (!folder || folder.space_id !== spaceId) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Folder tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  const { data: lists } = await supabase
    .from("pm_lists")
    .select("id, nama, deskripsi")
    .eq("folder_id", folderId)
    .order("urutan", { ascending: true });

  return (
    <FormPageShell maxWidth="max-w-4xl">
      <FormPageHeader
        title={folder.nama}
        subtitle={folder.deskripsi ?? undefined}
        backHref={`/pm/${workspaceId}/${spaceId}`}
        backLabel="Kembali ke Space"
      />

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <h2 className="text-[15px] font-semibold text-zinc-900">List</h2>
      <div className="mt-3">
        <PmEntityGrid
          items={lists ?? []}
          hrefBase={(id) => `/pm/${workspaceId}/${spaceId}/${id}`}
          emptyLabel="Belum ada List di Folder ini."
        />
      </div>

      <div className="mt-6 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Buat List baru</h3>
        <form action={createList} className="mt-4 grid grid-cols-1 gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="folderId" value={folderId} />
          <FormField label="Nama List" name="nama" />
          <button
            type="submit"
            className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Buat List
          </button>
        </form>
      </div>

      <div className="mt-10 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Pengaturan Folder</h3>
        <form action={renameFolder} className="mt-4 grid grid-cols-1 gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="folderId" value={folderId} />
          <FormField label="Nama Folder" name="nama" defaultValue={folder.nama} />
          <div>
            <label className="block text-[13px] font-medium text-zinc-500">
              Deskripsi (opsional)
            </label>
            <textarea
              name="deskripsi"
              rows={2}
              defaultValue={folder.deskripsi ?? ""}
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

        <form action={deleteFolder} className="mt-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="folderId" value={folderId} />
          <button
            type="submit"
            className="text-[13px] font-medium text-red-500 transition-colors hover:text-red-700"
          >
            Hapus Folder ini
          </button>
        </form>
      </div>
    </FormPageShell>
  );
}
