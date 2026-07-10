import Link from "next/link";

export function FormPageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Kembali",
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-8">
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1 text-[14px] text-zinc-400 transition-colors hover:text-zinc-700"
        >
          <span aria-hidden>&larr;</span> {backLabel}
        </Link>
      )}
      <h1 className="text-[26px] font-semibold tracking-tight text-zinc-900">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1.5 text-[15px] text-zinc-500">{subtitle}</p>
      )}
    </div>
  );
}
