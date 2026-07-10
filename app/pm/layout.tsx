import { getPmMembership } from "@/lib/pm/access";
import { getPmMobileMode } from "@/lib/pm/preferences";
import { createClient } from "@/lib/supabase/server";
import { PmSidebar } from "@/components/pm/PmSidebar";
import { PmModeToggle } from "@/components/pm/PmModeToggle";
import { FormPageShell } from "@/components/ui/FormPageShell";

type PmList = { id: string; nama: string };
type PmSpace = { id: string; nama: string; pm_lists: PmList[] };
type PmWorkspace = { id: string; nama: string; pm_spaces: PmSpace[] };

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

  if (mobileMode) {
    return (
      <div className="min-h-screen bg-[#fbfbfd]">
        <div className="flex justify-end px-6 pt-5 sm:px-10">
          <PmModeToggle mobileMode={mobileMode} />
        </div>
        {children}
      </div>
    );
  }

  const supabase = await createClient();
  const { data: workspacesRaw } = await supabase
    .from("pm_workspaces")
    .select("id, nama, pm_spaces(id, nama, pm_lists(id, nama))")
    .order("created_at", { ascending: true });

  const workspaces = (workspacesRaw ?? []) as unknown as PmWorkspace[];

  return (
    <div className="flex min-h-screen bg-[#fbfbfd]">
      <PmSidebar workspaces={workspaces} />
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="flex justify-end px-6 pt-5 sm:px-10">
          <PmModeToggle mobileMode={mobileMode} />
        </div>
        {children}
      </div>
    </div>
  );
}
