"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPmMobileMode } from "@/actions/pm/preferences";

export function PmModeToggle({ mobileMode }: { mobileMode: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setPmMobileMode(!mobileMode);
          router.refresh();
        })
      }
      className="rounded-full bg-zinc-100 px-4 py-1.5 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-50"
    >
      {mobileMode ? "Tampilan Desktop" : "Tampilan Mobile"}
    </button>
  );
}
