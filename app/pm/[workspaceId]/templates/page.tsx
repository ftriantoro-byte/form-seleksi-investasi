import { createClient } from "@/lib/supabase/server";
import { createListFromTemplate, deleteTemplate } from "@/actions/pm/templates";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { FormField } from "@/components/ui/FormField";

type PmTemplate = {
  id: string;
  nama: string;
  custom_fields: Array<{ nama: string }> | null;
  created_at: string;
};

type PmSpace = { id: string; nama: string };

export default async function TemplatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspaceId } = await params;
  const { error } = await searchParams;

  // Akses modul PM sudah dicek di app/pm/layout.tsx.
  const supabase = await createClient();

  const [{ data: workspace }, { data: templatesRaw }, { data: spacesRaw }] = await Promise.all([
    supabase.from("pm_workspaces").select("id, nama").eq("id", workspaceId).single(),
    supabase
      .from("pm_list_templates")
      .select("id, nama, custom_fields, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("pm_spaces")
      .select("id, nama")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
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

  const templates = (templatesRaw ?? []) as PmTemplate[];
  const spaces = (spacesRaw ?? []) as PmSpace[];

  return (
    <FormPageShell maxWidth="max-w-3xl">
      <FormPageHeader
        title="Template List"
        subtitle={`Workspace ${workspace.nama}`}
        backHref={`/pm/${workspaceId}`}
        backLabel="Kembali ke Workspace"
      />

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <div className="rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Template Tersimpan</h3>
        <ul className="mt-4 space-y-2">
          {templates.map((tpl) => (
            <li key={tpl.id} className="rounded-xl bg-zinc-50 px-4 py-3 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-zinc-800">{tpl.nama}</span>
                <form action={deleteTemplate}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="templateId" value={tpl.id} />
                  <button type="submit" className="text-zinc-400 hover:text-red-600">
                    Hapus
                  </button>
                </form>
              </div>
              <p className="mt-1 text-zinc-500">
                {(tpl.custom_fields?.length ?? 0)} Custom Field
              </p>
            </li>
          ))}
          {templates.length === 0 && (
            <li className="text-[14px] text-zinc-400">
              Belum ada Template. Simpan List sebagai Template lewat halaman List.
            </li>
          )}
        </ul>
      </div>

      {templates.length > 0 && spaces.length > 0 && (
        <div className="mt-8 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
          <h3 className="text-[14px] font-semibold text-zinc-900">Buat List dari Template</h3>
          <form action={createListFromTemplate} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <div>
              <label className="block text-[13px] font-medium text-zinc-500">Template</label>
              <select
                name="templateId"
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-zinc-500">Space tujuan</label>
              <select
                name="spaceId"
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
              >
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.nama}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <FormField label="Nama List baru" name="nama" />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Buat List
              </button>
            </div>
          </form>
        </div>
      )}
      {templates.length > 0 && spaces.length === 0 && (
        <p className="mt-6 text-[13px] text-zinc-400">
          Belum ada Space di Workspace ini - buat Space dulu sebelum instansiasi Template.
        </p>
      )}
    </FormPageShell>
  );
}
