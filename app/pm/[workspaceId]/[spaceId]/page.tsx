import { createClient } from "@/lib/supabase/server";
import { renameSpace, deleteSpace } from "@/actions/pm/spaces";
import { createFolder } from "@/actions/pm/folders";
import { createList } from "@/actions/pm/lists";
import { createWhiteboard } from "@/actions/pm/whiteboards";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { PmEntityGrid } from "@/components/pm/PmEntityGrid";
import { PmQuickAddForm } from "@/components/pm/PmQuickAddForm";

export default async function SpaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; spaceId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspaceId, spaceId } = await params;
  const { error } = await searchParams;
  // Akses modul PM sudah dicek di app/pm/layout.tsx.
  const supabase = await createClient();

  const { data: space } = await supabase
    .from("pm_spaces")
    .select("id, nama, deskripsi, workspace_id")
    .eq("id", spaceId)
    .single();

  if (!space || space.workspace_id !== workspaceId) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Space tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  const [{ data: folders }, { data: lists }, { data: whiteboards }] = await Promise.all([
    supabase
      .from("pm_folders")
      .select("id, nama, deskripsi")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: true }),
    // List langsung di bawah Space (belum masuk Folder manapun) - List di
    // dalam Folder ditampilkan di halaman Folder-nya sendiri.
    supabase
      .from("pm_lists")
      .select("id, nama, deskripsi")
      .eq("space_id", spaceId)
      .is("folder_id", null)
      .order("urutan", { ascending: true }),
    supabase
      .from("pm_whiteboards")
      .select("id, nama")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <FormPageShell maxWidth="max-w-4xl">
      <FormPageHeader
        title={space.nama}
        subtitle={space.deskripsi ?? undefined}
        backHref={`/pm/${workspaceId}`}
        backLabel="Kembali ke Workspace"
      />

      <div className="mb-4">
        <details className="group relative">
          <summary className="cursor-pointer list-none rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200">
            ⚙️ Pengaturan Space
          </summary>
          <div className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[90vw] rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl">
            <form action={renameSpace} className="grid grid-cols-1 gap-2">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="spaceId" value={spaceId} />
              <label className="block text-[11px] font-medium text-zinc-500">Nama Space</label>
              <input
                name="nama"
                defaultValue={space.nama}
                required
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
              />
              <label className="block text-[11px] font-medium text-zinc-500">
                Deskripsi (opsional)
              </label>
              <textarea
                name="deskripsi"
                rows={2}
                defaultValue={space.deskripsi ?? ""}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
              />
              <button
                type="submit"
                className="w-fit rounded-full bg-zinc-100 px-4 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200"
              >
                Simpan Perubahan
              </button>
            </form>
            <form action={deleteSpace} className="mt-2 border-t border-zinc-100 pt-2">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="spaceId" value={spaceId} />
              <button
                type="submit"
                className="text-[12px] font-medium text-red-500 hover:text-red-700"
              >
                Hapus Space ini
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

      <h2 className="text-[15px] font-semibold text-zinc-900">Folder</h2>
      <div className="mt-3">
        <PmQuickAddForm
          action={createFolder}
          hiddenFields={{ workspaceId, spaceId }}
          placeholder="Buat Folder baru..."
          submitLabel="Buat"
        />
        <PmEntityGrid
          items={folders ?? []}
          hrefBase={(id) => `/pm/${workspaceId}/${spaceId}/folder/${id}`}
          emptyLabel="Belum ada Folder."
        />
      </div>

      <h2 className="mt-8 text-[15px] font-semibold text-zinc-900">List</h2>
      <p className="mt-1 text-[13px] text-zinc-400">List langsung di Space ini (di luar Folder).</p>
      <div className="mt-3">
        <PmQuickAddForm
          action={createList}
          hiddenFields={{ workspaceId, spaceId }}
          placeholder="Buat List baru..."
          submitLabel="Buat"
          primary
        />
        <PmEntityGrid
          items={lists ?? []}
          hrefBase={(id) => `/pm/${workspaceId}/${spaceId}/${id}`}
          emptyLabel="Belum ada List."
        />
      </div>

      <h2 className="mt-8 text-[15px] font-semibold text-zinc-900">Whiteboard</h2>
      <div className="mt-3">
        <PmQuickAddForm
          action={createWhiteboard}
          hiddenFields={{ workspaceId, spaceId }}
          placeholder="Buat Whiteboard baru..."
          submitLabel="Buat"
        />
        <PmEntityGrid
          items={whiteboards ?? []}
          hrefBase={(id) => `/pm/${workspaceId}/${spaceId}/whiteboard/${id}`}
          emptyLabel="Belum ada Whiteboard."
        />
      </div>
    </FormPageShell>
  );
}
