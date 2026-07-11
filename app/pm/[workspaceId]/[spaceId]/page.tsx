import { createClient } from "@/lib/supabase/server";
import { renameSpace, deleteSpace } from "@/actions/pm/spaces";
import { createFolder } from "@/actions/pm/folders";
import { createList } from "@/actions/pm/lists";
import { createWhiteboard } from "@/actions/pm/whiteboards";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { FormField } from "@/components/ui/FormField";
import { PmEntityGrid } from "@/components/pm/PmEntityGrid";

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

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <h2 className="text-[15px] font-semibold text-zinc-900">Folder</h2>
      <div className="mt-3">
        <PmEntityGrid
          items={folders ?? []}
          hrefBase={(id) => `/pm/${workspaceId}/${spaceId}/folder/${id}`}
          emptyLabel="Belum ada Folder."
        />
      </div>

      <div className="mt-4 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Buat Folder baru</h3>
        <form action={createFolder} className="mt-4 grid grid-cols-1 gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="spaceId" value={spaceId} />
          <FormField label="Nama Folder" name="nama" />
          <button
            type="submit"
            className="w-fit rounded-full bg-zinc-100 px-5 py-2.5 text-[14px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
          >
            Buat Folder
          </button>
        </form>
      </div>

      <h2 className="mt-10 text-[15px] font-semibold text-zinc-900">List</h2>
      <p className="mt-1 text-[13px] text-zinc-400">List langsung di Space ini (di luar Folder).</p>
      <div className="mt-3">
        <PmEntityGrid
          items={lists ?? []}
          hrefBase={(id) => `/pm/${workspaceId}/${spaceId}/${id}`}
          emptyLabel="Belum ada List."
        />
      </div>

      <div className="mt-6 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Buat List baru</h3>
        <form action={createList} className="mt-4 grid grid-cols-1 gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="spaceId" value={spaceId} />
          <FormField label="Nama List" name="nama" />
          <button
            type="submit"
            className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Buat List
          </button>
        </form>
      </div>

      <h2 className="mt-10 text-[15px] font-semibold text-zinc-900">Whiteboard</h2>
      <div className="mt-3">
        <PmEntityGrid
          items={whiteboards ?? []}
          hrefBase={(id) => `/pm/${workspaceId}/${spaceId}/whiteboard/${id}`}
          emptyLabel="Belum ada Whiteboard."
        />
      </div>

      <div className="mt-6 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Buat Whiteboard baru</h3>
        <form action={createWhiteboard} className="mt-4 grid grid-cols-1 gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="spaceId" value={spaceId} />
          <FormField label="Nama Whiteboard" name="nama" />
          <button
            type="submit"
            className="w-fit rounded-full bg-zinc-100 px-5 py-2.5 text-[14px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
          >
            Buat Whiteboard
          </button>
        </form>
      </div>

      <div className="mt-10 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Pengaturan Space</h3>
        <form action={renameSpace} className="mt-4 grid grid-cols-1 gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="spaceId" value={spaceId} />
          <FormField label="Nama Space" name="nama" defaultValue={space.nama} />
          <div>
            <label className="block text-[13px] font-medium text-zinc-500">
              Deskripsi (opsional)
            </label>
            <textarea
              name="deskripsi"
              rows={2}
              defaultValue={space.deskripsi ?? ""}
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

        <form action={deleteSpace} className="mt-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="spaceId" value={spaceId} />
          <button
            type="submit"
            className="text-[13px] font-medium text-red-500 transition-colors hover:text-red-700"
          >
            Hapus Space ini
          </button>
        </form>
      </div>
    </FormPageShell>
  );
}
