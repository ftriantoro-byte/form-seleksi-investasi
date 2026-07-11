"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PmRealtimeSubscription = { table: string; filter: string };

// Komponen tanpa tampilan (return null) - cuma subscribe Supabase Realtime
// Postgres Changes (lihat PM-MODULE-SPEC.md §5) dan router.refresh() begitu
// ada perubahan, supaya List/Board/Task Detail ter-update otomatis tanpa
// user perlu reload manual saat anggota lain mengubah data yang sama.
export function PmRealtimeRefresher({
  channelName,
  subscriptions,
}: {
  channelName: string;
  subscriptions: PmRealtimeSubscription[];
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // RLS pada tabel pm_* butuh auth.uid() - realtime harus diberi tahu
    // token akses user saat ini (realtime.setAuth) SEBELUM subscribe, kalau
    // tidak koneksi realtime jalan sebagai anon dan semua event postgres_changes
    // ditolak diam-diam oleh RLS (subscribe tetap sukses, tapi event tidak
    // pernah sampai). @supabase/ssr tidak otomatis melakukan ini secepat
    // channel dibuat, jadi di-set manual di sini.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) {
        supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase.channel(channelName);
      for (const sub of subscriptions) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: sub.table, filter: sub.filter },
          () => router.refresh(),
        );
      }
      channel.subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);

  return null;
}
