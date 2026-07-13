import Link from "next/link";

type Entity = {
  id: string;
  nama: string;
  deskripsi?: string | null;
};

export function PmEntityGrid({
  items,
  hrefBase,
  emptyLabel,
}: {
  items: Entity[];
  hrefBase: (id: string) => string;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-[14px] text-zinc-400">{emptyLabel}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={hrefBase(item.id)}
          className="pm-card group rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
        >
          <div className="flex items-start justify-between">
            <h2 className="text-[17px] font-semibold text-zinc-900">{item.nama}</h2>
            <span className="mt-0.5 text-zinc-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-400">
              &rarr;
            </span>
          </div>
          {item.deskripsi && (
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">
              {item.deskripsi}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
