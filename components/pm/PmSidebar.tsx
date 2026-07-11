"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PmList = { id: string; nama: string };
type PmFolder = { id: string; nama: string; lists: PmList[] };
type PmSpace = { id: string; nama: string; folders: PmFolder[]; lists: PmList[] };
type PmWorkspace = { id: string; nama: string; spaces: PmSpace[] };

export function PmSidebar({ workspaces }: { workspaces: PmWorkspace[] }) {
  const pathname = usePathname();

  function listLink(href: string, label: string, indentClass: string) {
    return (
      <Link
        key={href}
        href={href}
        className={`${indentClass} block truncate rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
          pathname === href
            ? "bg-zinc-100 font-medium text-zinc-900"
            : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
        }`}
      >
        {label}
      </Link>
    );
  }

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
            {ws.spaces.map((space) => {
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
                  {space.folders.map((folder) => {
                    const folderHref = `${spaceHref}/folder/${folder.id}`;
                    return (
                      <div key={folder.id} className="ml-3">
                        {listLink(folderHref, `📁 ${folder.nama}`, "")}
                        {folder.lists.map((list) =>
                          listLink(`${spaceHref}/${list.id}`, `# ${list.nama}`, "ml-3"),
                        )}
                      </div>
                    );
                  })}
                  {space.lists.map((list) =>
                    listLink(`${spaceHref}/${list.id}`, `# ${list.nama}`, "ml-3"),
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
