import { createClient } from "@/lib/supabase/server";
import { getPmMembership } from "@/lib/pm/access";
import { createWorkspace } from "@/actions/pm/workspaces";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { FormField } from "@/components/ui/FormField";
import { PmEntityGrid } from "@/components/pm/PmEntityGrid";

export default async function PmHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
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
  const { data: workspaces } = await supabase
    .from("pm_workspaces")
    .select("id, nama, deskripsi")
    .order("created_at", { ascending: true });

  return (
    <FormPageShell maxWidth="max-w-4xl">
      <FormPageHeader title="Manajemen Proyek" subtitle="Pilih Workspace, atau buat yang baru." />

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <PmEntityGrid
        items={workspaces ?? []}
        hrefBase={(id) => `/pm/${id}`}
        emptyLabel="Belum ada Workspace."
      />

      {pmRole === "admin" && (
        <div className="mt-8 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
          <h2 className="text-[15px] font-semibold text-zinc-900">Buat Workspace baru</h2>
          <form action={createWorkspace} className="mt-4 grid grid-cols-1 gap-4">
            <FormField label="Nama Workspace" name="nama" />
            <div>
              <label className="block text-[13px] font-medium text-zinc-500">
                Deskripsi (opsional)
              </label>
              <textarea
                name="deskripsi"
                rows={2}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <button
              type="submit"
              className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Buat Workspace
            </button>
          </form>
        </div>
      )}
    </FormPageShell>
  );
}
