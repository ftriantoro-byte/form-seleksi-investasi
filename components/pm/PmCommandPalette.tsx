"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchPm, type PmSearchResult } from "@/actions/pm/search";

const TYPE_LABEL: Record<PmSearchResult["type"], string> = {
  workspace: "Workspace",
  space: "Space",
  list: "List",
  task: "Task",
  meeting: "Meeting",
};

export function PmCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PmSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function closePalette() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) {
            setQuery("");
            setResults([]);
          }
          return !prev;
        });
      } else if (e.key === "Escape") {
        closePalette();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const found = await searchPm(value);
        setResults(found);
      });
    }, 250);
  }

  function handleSelect(href: string) {
    closePalette();
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-4 py-1.5 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
      >
        Cari <span className="text-zinc-400">⌘K</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-24 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closePalette} aria-hidden />
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Cari Workspace, Space, List, Task, Meeting..."
              className="w-full rounded-t-3xl border-b border-zinc-100 px-5 py-4 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400"
            />
            <div className="max-h-80 overflow-y-auto p-2">
              {isPending && <p className="px-3 py-2 text-[13px] text-zinc-400">Mencari...</p>}
              {!isPending && query.trim().length >= 2 && results.length === 0 && (
                <p className="px-3 py-2 text-[13px] text-zinc-400">Tidak ada hasil.</p>
              )}
              {!isPending &&
                results.map((r, i) => (
                  <button
                    key={`${r.type}-${r.href}-${i}`}
                    type="button"
                    onClick={() => handleSelect(r.href)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] text-zinc-800 transition-colors hover:bg-zinc-50"
                  >
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                      {TYPE_LABEL[r.type]}
                    </span>
                    <span className="truncate">{r.label}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
