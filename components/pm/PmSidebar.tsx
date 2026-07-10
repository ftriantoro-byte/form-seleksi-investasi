"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PmList = { id: string; nama: string };
type PmSpace = { id: string; nama: string; pm_lists: PmList[] };
type PmWorkspace = { id: string; nama: string; pm_spaces: PmSpace[] };

export function PmSidebar({ workspaces }: { workspaces: PmWorkspace[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-black/[0.04] bg-white px-3 py-5">
      <Link
        href="/pm"
        className={`mb-3 truncate rounded-xl px-3 py-2 text-[14px] font-semibold transition-colors ${
          pathname === "/pm" ? "bg-zinc-900 text-white" : "text-zinc-900 hover:bg-zinc-100"
        }`}
      >
        Manajemen Proyek
      </Link>

      {workspaces.map((ws) => {
        const workspaceHref = `/pm/${ws.id}`;
        return (
          <div key={ws.id} className="mb-3">
            <Link
              href={workspaceHref}
              className={`block truncate rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                pathname === workspaceHref
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              {ws.nama}
            </Link>
            {ws.pm_spaces.map((space) => {
              const spaceHref = `${workspaceHref}/${space.id}`;
              return (
                <div key={space.id} className="ml-3">
                  <Link
                    href={spaceHref}
                    className={`block truncate rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                      pathname === spaceHref
                        ? "bg-zinc-100 font-medium text-zinc-900"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    {space.nama}
                  </Link>
                  {space.pm_lists.map((list) => {
                    const listHref = `${spaceHref}/${list.id}`;
                    return (
                      <Link
                        key={list.id}
                        href={listHref}
                        className={`ml-3 block truncate rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                          pathname === listHref
                            ? "bg-zinc-100 font-medium text-zinc-900"
                            : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
                        }`}
                      >
                        {list.nama}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
