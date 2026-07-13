import { createClient } from "@/lib/supabase/server";
import { renameFolder, deleteFolder } from "@/actions/pm/folders";
import { createList } from "@/actions/pm/lists";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { PmEntityGrid } from "@/components/pm/PmEntityGrid";
import { PmQuickAddForm } from "@/components/pm/PmQuickAddForm";

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

      <div className="mb-4">
        <details className="group relative">
          <summary className="cursor-pointer list-none rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200 group-open:bg-zinc-900 group-open:text-white group-open:hover:bg-zinc-900">
            ⚙️ Pengaturan Folder
          </summary>
          <div className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[90vw] rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl">
            <form action={renameFolder} className="grid grid-cols-1 gap-2">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="spaceId" value={spaceId} />
              <input type="hidden" name="folderId" value={folderId} />
              <label className="block text-[11px] font-medium text-zinc-500">Nama Folder</label>
              <input
                name="nama"
                defaultValue={folder.nama}
                required
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
              />
              <label className="block text-[11px] font-medium text-zinc-500">
                Deskripsi (opsional)
              </label>
              <textarea
                name="deskripsi"
                rows={2}
                defaultValue={folder.deskripsi ?? ""}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
              />
              <button
                type="submit"
                className="w-fit rounded-full bg-zinc-100 px-4 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200"
              >
                Simpan Perubahan
              </button>
            </form>
            <form action={deleteFolder} className="mt-2 border-t border-zinc-100 pt-2">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="spaceId" value={spaceId} />
              <input type="hidden" name="folderId" value={folderId} />
              <button
                type="submit"
                className="text-[12px] font-medium text-red-500 hover:text-red-700"
              >
                Hapus Folder ini
              </button>
            </form>
          </div>
        </details>
      </div>

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <h2 className="text-[15px] font-semibold text-zinc-900">List</h2>
      <div className="mt-3">
        <PmQuickAddForm
          action={createList}
          hiddenFields={{ workspaceId, spaceId, folderId }}
          placeholder="Buat List baru..."
          submitLabel="Buat"
          primary
        />
        <PmEntityGrid
          items={lists ?? []}
          hrefBase={(id) => `/pm/${workspaceId}/${spaceId}/${id}`}
          emptyLabel="Belum ada List di Folder ini."
        />
      </div>
    </FormPageShell>
  );
}
