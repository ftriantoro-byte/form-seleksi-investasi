export function FormPageShell({
  children,
  maxWidth = "max-w-2xl",
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      <main className={`mx-auto ${maxWidth} px-6 py-14 sm:px-10 sm:py-16`}>
        {children}
      </main>
    </div>
  );
}
