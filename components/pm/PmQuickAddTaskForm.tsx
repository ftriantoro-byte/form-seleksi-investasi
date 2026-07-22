"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTaskQuick } from "@/actions/pm/tasks";

// Sebelumnya form ini "use server" biasa (action={createTask}) yang SELALU
// redirect ke Task Detail begitu Task baru dibuat - user minta tetap di List
// (halaman yang sama) supaya bisa cepat menambahkan beberapa Task berturut-
// turut dulu, baru didetailkan belakangan. Pola sama persis dengan
// quick-add di PmCalendarView: manggil createTaskQuick langsung (bukan lewat
// <form action=fn>), lalu router.refresh() - tidak ada navigasi sama sekali.
export function PmQuickAddTaskForm({ listId }: { listId: string }) {
  const router = useRouter();
  const [judul, setJudul] = useState("");
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = judul.trim();
    if (!trimmed) return;
    setJudul("");
    startTransition(async () => {
      await createTaskQuick(listId, trimmed, "");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-3 flex items-center gap-2">
      <input
        value={judul}
        onChange={(e) => setJudul(e.target.value)}
        required
        placeholder="Tambah task baru..."
        className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[14px] text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
      />
      <button
        type="submit"
        className="rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700"
      >
        Tambah
      </button>
    </form>
  );
}
