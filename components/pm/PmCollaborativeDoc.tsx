"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { createClient } from "@/lib/supabase/client";
import { saveDocState } from "@/actions/pm/docs";
import { hexToUint8Array, uint8ArrayToBase64, base64ToUint8Array } from "@/lib/pm/yjs-encoding";

// Diff sederhana: cari prefix & suffix sama, sisanya di tengah dianggap
// berubah. Bukan diff minimal sempurna, tapi cukup untuk kasus umum
// (mengetik/menghapus di satu titik kursor) dan tetap menghasilkan operasi
// Yjs granular per-karakter (bukan replace-semua/last-write-wins).
function applyTextDiff(ytext: Y.Text, oldStr: string, newStr: string) {
  let start = 0;
  while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
    start++;
  }
  let endOld = oldStr.length;
  let endNew = newStr.length;
  while (endOld > start && endNew > start && oldStr[endOld - 1] === newStr[endNew - 1]) {
    endOld--;
    endNew--;
  }
  if (endOld > start) ytext.delete(start, endOld - start);
  if (endNew > start) ytext.insert(start, newStr.slice(start, endNew));
}

function computeInitialText(initialStateHex: string | null): string {
  if (!initialStateHex) return "";
  try {
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, hexToUint8Array(initialStateHex));
    const text = tempDoc.getText("content").toString();
    tempDoc.destroy();
    return text;
  } catch {
    return "";
  }
}

// Doc kolaboratif tertaut ke Task (B.5) - dipakai juga untuk Notulensi
// Meeting nanti (C.4, "editor kolaboratif real-time yang SAMA dengan Docs",
// PM-MODULE-SPEC.md §4), makanya props-nya generik (docId + initialStateHex,
// bukan taskId). Sinkron live pakai Supabase Realtime Broadcast (bukan
// Postgres Changes - lihat PM-MODULE-SPEC.md §5); state Yjs penuh disimpan
// ke DB berkala (debounce 1.5 detik) lewat Server Action supaya Doc tidak
// hilang saat semua orang keluar.
export function PmCollaborativeDoc({
  docId,
  initialStateHex,
}: {
  docId: string;
  initialStateHex: string | null;
}) {
  const [text, setText] = useState(() => computeInitialText(initialStateHex));
  const ydocRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("content");
    ydocRef.current = ydoc;
    ytextRef.current = ytext;

    if (initialStateHex) {
      try {
        Y.applyUpdate(ydoc, hexToUint8Array(initialStateHex));
      } catch {
        // state kosong/tidak valid - mulai dari dokumen kosong
      }
    }

    const observer = () => setText(ytext.toString());
    ytext.observe(observer);

    const updateHandler = (update: Uint8Array, origin: unknown) => {
      // Update yang datang dari applyUpdate remote (di bawah) tidak perlu
      // di-broadcast ulang - Yjs sendiri idempotent kalau tetap ke-broadcast
      // (mis. karena Supabase broadcast echo ke pengirim sendiri), tapi ini
      // menghindari round-trip yang tidak perlu.
      if (origin === "remote") return;

      channelRef.current?.send({
        type: "broadcast",
        event: "yjs-update",
        payload: { update: uint8ArrayToBase64(update) },
      });

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const fullState = Y.encodeStateAsUpdate(ydoc);
        saveDocState(docId, uint8ArrayToBase64(fullState)).catch(() => {
          // persistensi berkala best-effort - sinkron live tetap jalan via Broadcast
        });
      }, 1500);
    };
    ydoc.on("update", updateHandler);

    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      const channel = supabase.channel(`pm-doc-${docId}`);
      channelRef.current = channel;
      channel.on("broadcast", { event: "yjs-update" }, ({ payload }) => {
        const update = base64ToUint8Array(payload.update as string);
        Y.applyUpdate(ydoc, update, "remote");
      });
      channel.subscribe();
    });

    return () => {
      cancelled = true;
      ytext.unobserve(observer);
      ydoc.off("update", updateHandler);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      ydoc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const ytext = ytextRef.current;
    const ydoc = ydocRef.current;
    if (!ytext || !ydoc) return;
    const newValue = e.target.value;
    ydoc.transact(() => {
      applyTextDiff(ytext, text, newValue);
    });
  }

  return (
    <textarea
      value={text}
      onChange={handleChange}
      rows={10}
      placeholder="Tulis catatan di sini... (kolaboratif real-time, tersimpan otomatis)"
      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
    />
  );
}
