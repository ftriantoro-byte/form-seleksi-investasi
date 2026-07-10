import Link from "next/link";

export function PmNotificationBell({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href="/pm/notifications"
      className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-4 py-1.5 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
    >
      Notifikasi
      {unreadCount > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
