import { createClient } from "@/lib/supabase/server";
import { getPmMembership } from "@/lib/pm/access";
import { createWorkspace } from "@/actions/pm/workspaces";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { PmEntityGrid } from "@/components/pm/PmEntityGrid";
import { PmQuickAddForm } from "@/components/pm/PmQuickAddForm";

export default async function PmHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // Akses modul PM sudah dicek di app/pm/layout.tsx - pmRole di sini pasti terisi.
  const pmRole = await getPmMembership();

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

      {pmRole === "admin" && (
        <PmQuickAddForm
          action={createWorkspace}
          hiddenFields={{}}
          placeholder="Buat Workspace baru..."
          submitLabel="Buat"
          primary
        />
      )}

      <PmEntityGrid
        items={workspaces ?? []}
        hrefBase={(id) => `/pm/${id}`}
        emptyLabel="Belum ada Workspace."
      />
    </FormPageShell>
  );
}
