import { PmTaskModal } from "@/components/pm/PmTaskModal";
import { PmTaskDetailContent } from "@/components/pm/PmTaskDetailContent";

export default async function TaskModalPage({
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
