// Slot @modal dipakai untuk intercepting route Task Detail (lihat
// @modal/(..)[spaceId]/[listId]/[taskId]/page.tsx) - klik Task dari tab
// manapun di Dashboard Workspace (List/Board/Calendar/Time Box) membuka
// modal tanpa meninggalkan konteks Dashboard (filter/tab/tanggal yang
// sedang aktif tetap ada di balik modal). Pola sama persis dengan
// app/pm/[workspaceId]/[spaceId]/[listId]/layout.tsx - lihat PROGRESS.md.
export default function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
