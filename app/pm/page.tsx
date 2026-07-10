import { getPmMembership } from "@/lib/pm/access";
import { FormPageShell } from "@/components/ui/FormPageShell";

export default async function PmHomePage() {
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

  return (
    <FormPageShell maxWidth="max-w-4xl">
      <h1 className="text-[26px] font-semibold tracking-tight text-zinc-900">
        Manajemen Proyek
      </h1>
      <p className="mt-2 text-[15px] text-zinc-500">
        Workspace Anda akan tampil di sini setelah tahap A.3 dikerjakan.
      </p>
    </FormPageShell>
  );
}
