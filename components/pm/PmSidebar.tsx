"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

type PmList = { id: string; nama: string };
type PmFolder = { id: string; nama: string; lists: PmList[] };
type PmSpace = { id: string; nama: string; folders: PmFolder[]; lists: PmList[] };
type PmWorkspace = { id: string; nama: string; spaces: PmSpace[] };

// Pohon Workspace/Space/Folder bisa cukup dalam & panjang (banyak List) -
// collapsible per node (state lokal di komponen, bukan disimpan ke DB/URL)
// supaya user bisa menyembunyikan cabang yang sedang tidak dipakai tanpa
// kehilangan konteks navigasi saat pindah halaman (PmSidebar dirender sekali
// oleh app/pm/layout.tsx dan tidak remount saat berpindah antar halaman di
// dalam /pm, jadi state expand/collapse-nya bertahan selama sesi).
export function PmSidebar({ workspaces }: { workspaces: PmWorkspace[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function chevron(id: string) {
    return (
      <button
        type="button"
        onClick={() => toggle(id)}
        aria-label={collapsed.has(id) ? "Buka" : "Tutup"}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-300 hover:bg-zinc-100 hover:text-zinc-600"
      >
        <span
          className={`inline-block text-[9px] transition-transform ${collapsed.has(id) ? "-rotate-90" : ""}`}
        >
          ▾
        </span>
      </button>
    );
  }

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
        Task Management
      </Link>

      {workspaces.map((ws) => {
        const workspaceHref = `/pm/${ws.id}`;
        const wsCollapsed = collapsed.has(ws.id);
        return (
          <div key={ws.id} className="mb-1">
            <div className="flex items-center gap-0.5">
              {chevron(ws.id)}
              <Link
                href={workspaceHref}
                className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-[13px] font-semibold transition-colors ${
                  pathname === workspaceHref
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                {ws.nama}
              </Link>
            </div>
            {!wsCollapsed &&
              ws.spaces.map((space) => {
                const spaceHref = `${workspaceHref}/${space.id}`;
                const spaceCollapsed = collapsed.has(space.id);
                const hasChildren = space.folders.length > 0 || space.lists.length > 0;
                return (
                  <div key={space.id} className="ml-2.5">
                    <div className="flex items-center gap-0.5">
                      {hasChildren ? (
                        chevron(space.id)
                      ) : (
                        <span className="h-5 w-5 shrink-0" />
                      )}
                      <Link
                        href={spaceHref}
                        className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                          pathname === spaceHref
                            ? "bg-zinc-100 font-medium text-zinc-900"
                            : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                        }`}
                      >
                        {space.nama}
                      </Link>
                    </div>
                    {!spaceCollapsed && (
                      <>
                        {space.folders.map((folder) => {
                          const folderHref = `${spaceHref}/folder/${folder.id}`;
                          const folderCollapsed = collapsed.has(folder.id);
                          return (
                            <div key={folder.id} className="ml-2.5">
                              <div className="flex items-center gap-0.5">
                                {folder.lists.length > 0 ? (
                                  chevron(folder.id)
                                ) : (
                                  <span className="h-5 w-5 shrink-0" />
                                )}
                                <Link
                                  href={folderHref}
                                  className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                                    pathname === folderHref
                                      ? "bg-zinc-100 font-medium text-zinc-900"
                                      : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
                                  }`}
                                >
                                  📁 {folder.nama}
                                </Link>
                              </div>
                              {!folderCollapsed &&
                                folder.lists.map((list) =>
                                  listLink(`${spaceHref}/${list.id}`, `# ${list.nama}`, "ml-6"),
                                )}
                            </div>
                          );
                        })}
                        {space.lists.map((list) =>
                          listLink(`${spaceHref}/${list.id}`, `# ${list.nama}`, "ml-6"),
                        )}
                      </>
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
