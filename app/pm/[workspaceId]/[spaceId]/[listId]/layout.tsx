// Slot @modal dipakai untuk intercepting route Task Detail (lihat
// @modal/(.)[taskId]/page.tsx) - klik Task dari List/Board membuka modal
// tanpa meninggalkan konteks List; refresh/link langsung tetap menampilkan
// halaman penuh di [taskId]/page.tsx. Lihat PROGRESS.md tahap A.6.
export default function ListLayout({
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
