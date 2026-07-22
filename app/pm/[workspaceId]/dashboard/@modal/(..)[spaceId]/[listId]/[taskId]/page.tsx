import { PmTaskModal } from "@/components/pm/PmTaskModal";
import { PmTaskDetailContent } from "@/components/pm/PmTaskDetailContent";

// Intercepting route utk Task Detail yang dibuka dari Dashboard Workspace
// (List/Board/Calendar/Time Box tab) - "(..)" krn dari segmen "dashboard"
// target "/[spaceId]/[listId]/[taskId]" cuma 1 level route SEGMENT lebih
// tinggi (naik dari "dashboard" ke "[workspaceId]", lalu turun lagi -
// "@modal" sendiri bukan segmen, jadi tidak dihitung - lihat
// node_modules/next/dist/docs/.../intercepting-routes.md). Pola & komponen
// SAMA PERSIS dengan [listId]/@modal/(.)[taskId]/page.tsx (List page) -
// PmTaskDetailContent sudah didesain generik menerima workspaceId/spaceId/
// listId/taskId dari mana saja, jadi tidak perlu logika baru di sini.
export default async function DashboardTaskModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; spaceId: string; listId: string; taskId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspaceId, spaceId, listId, taskId } = await params;
  const { error } = await searchParams;
  // Akses modul PM sudah dicek di app/pm/layout.tsx.

  return (
    <PmTaskModal expectedPath={`/pm/${workspaceId}/${spaceId}/${listId}/${taskId}`}>
      <PmTaskDetailContent
        workspaceId={workspaceId}
        spaceId={spaceId}
        listId={listId}
        taskId={taskId}
        error={error}
      />
    </PmTaskModal>
  );
}
