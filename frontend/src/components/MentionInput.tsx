"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UserHit {
  id: string;
  username: string;
  avatar?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * A textarea (single-line input) that detects `@partial` patterns at the cursor
 * and shows a user-search autocomplete dropdown.
 *
 * Typing `@elden` → fetches users matching "elden" → selecting inserts `@username `.
 */
export default function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Write a comment...",
  maxLength = 500,
  className = "",
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Fetch users matching current @-query
  const { data: suggestions = [] } = useQuery<UserHit[]>({
    queryKey: ["mention-users", mentionQuery],
    queryFn: () =>
      api.get(`/api/users/search?q=${encodeURIComponent(mentionQuery!)}`).then((r) => r.data),
    enabled: mentionQuery !== null && mentionQuery.length > 0,
    staleTime: 30_000,
  });

  const showDropdown = mentionQuery !== null && suggestions.length > 0;

  // Detect @word at cursor whenever value or cursor moves
  const detectMention = useCallback((text: string, cursor: number) => {
    const before = text.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(before.lastIndexOf("@"));
      setActiveIndex(0);
    } else {
      setMentionQuery(null);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    detectMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
  }

  function handleSelect(username: string) {
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
    const newValue = `${before}@${username} ${after}`;
    onChange(newValue);
    setMentionQuery(null);
    // Restore focus and place cursor after the inserted mention
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = before.length + username.length + 2; // @username + space
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showDropdown) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelect(suggestions[activeIndex].username);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !showDropdown) {
      e.preventDefault();
      onSubmit?.();
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.closest("[data-mention-root]")?.contains(e.target as Node)) {
        setMentionQuery(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative flex-1" data-mention-root>
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => detectMention(value, (e.target as HTMLInputElement).selectionStart ?? value.length)}
        onFocus={(e) => detectMention(value, (e.target as HTMLInputElement).selectionStart ?? value.length)}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 ${className}`}
      />

      {showDropdown && (
        <div className="absolute bottom-full left-0 mb-1 w-56 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
          {suggestions.slice(0, 6).map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur before click fires
                handleSelect(u.username);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                i === activeIndex ? "bg-violet-700 text-white" : "text-gray-200 hover:bg-white/8"
              }`}
            >
              <span className="font-medium">@{u.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

