"use client";

import { useRef, useState } from "react";

// Textarea komentar dengan autocomplete "@email" - sebelumnya @mention cuma
// diparsing sebagai teks bebas SETELAH submit (lihat lib/pm/mentions.tsx),
// tanpa bantuan ketik sama sekali. Di sini murni UI: pilih saran cuma
// menyisipkan teks "@email " ke textarea, parsing/notifikasi mention tetap
// lewat mekanisme lama di Server Action createComment - tidak ada perubahan
// pada cara mention disimpan, cuma cara mengetiknya jadi lebih gampang.
export function PmMentionTextarea({
  name,
  placeholder,
  rows,
  members,
  className,
}: {
  name: string;
  placeholder?: string;
  rows?: number;
  members: { email: string }[];
  className: string;
}) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [triggerStart, setTriggerStart] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function updateSuggestions(text: string, cursorPos: number) {
    const textBeforeCursor = text.slice(0, cursorPos);
    const match = textBeforeCursor.match(/(?:^|\s)@([\w.+-]*)$/);
    if (match) {
      const query = match[1].toLowerCase();
      const start = cursorPos - match[1].length - 1;
      const filtered = members
        .map((m) => m.email)
        .filter((email) => email.toLowerCase().includes(query))
        .slice(0, 5);
      if (filtered.length > 0) {
        setSuggestions(filtered);
        setTriggerStart(start);
        setActiveIndex(0);
        return;
      }
    }
    setSuggestions([]);
    setTriggerStart(null);
  }

  function selectSuggestion(email: string) {
    const textarea = textareaRef.current;
    if (triggerStart === null || !textarea) return;
    const cursorPos = textarea.selectionStart;
    const before = value.slice(0, triggerStart);
    const after = value.slice(cursorPos);
    const newValue = `${before}@${email} ${after}`;
    setValue(newValue);
    setSuggestions([]);
    setTriggerStart(null);
    requestAnimationFrame(() => {
      const pos = before.length + email.length + 2;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        placeholder={placeholder}
        rows={rows}
        className={className}
        onChange={(e) => {
          setValue(e.target.value);
          updateSuggestions(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={(e) => {
          if (suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            selectSuggestion(suggestions[activeIndex]);
          } else if (e.key === "Escape") {
            setSuggestions([]);
            setTriggerStart(null);
          }
        }}
      />
      {suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 z-20 mb-1 w-56 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {suggestions.map((email, i) => (
            <button
              key={email}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(email);
              }}
              className={`block w-full truncate px-3 py-1.5 text-left text-[13px] ${
                i === activeIndex ? "bg-zinc-100 text-zinc-900" : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {email}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
