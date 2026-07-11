import type { ReactNode } from "react";
import Link from "next/link";

type TaskRef = { id: string; judul: string };

const MENTION_PATTERN = /(@[\w.+-]+@[\w.-]+\.\w+)|(#\[[^\]]{1,80}\])/g;

/** Dipakai server-side (createComment) untuk cari email anggota yang di-@mention di sebuah komentar. */
export function extractMentionedEmails(text: string, knownEmails: string[]): string[] {
  const found = new Set<string>();
  const knownSet = new Set(knownEmails);
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const token = match[0];
    if (token.startsWith("@")) {
      const email = token.slice(1);
      if (knownSet.has(email)) found.add(email);
    }
  }
  return [...found];
}

/**
 * Render teks komentar dengan @email dan #[Judul Task] dilinkifikasi -
 * dipakai di PmTaskDetailContent, BUKAN pemeriksaan keamanan (cuma tampilan).
 */
export function renderMentionText(
  text: string,
  knownEmails: string[],
  tasksInList: TaskRef[],
  listBase: string,
): ReactNode[] {
  const knownSet = new Set(knownEmails);
  const taskByTitle = new Map(tasksInList.map((t) => [t.judul, t]));
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    const token = match[0];

    if (token.startsWith("@")) {
      const email = token.slice(1);
      if (knownSet.has(email)) {
        parts.push(
          <span
            key={key++}
            className="rounded bg-blue-50 px-1 font-medium text-blue-700"
          >
            {token}
          </span>,
        );
      } else {
        parts.push(token);
      }
    } else {
      const title = token.slice(2, -1);
      const task = taskByTitle.get(title);
      if (task) {
        parts.push(
          <Link
            key={key++}
            href={`${listBase}/${task.id}`}
            className="rounded bg-zinc-100 px-1 font-medium text-zinc-700 hover:underline"
          >
            {token}
          </Link>,
        );
      } else {
        parts.push(token);
      }
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
