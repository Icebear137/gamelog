"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Search, Users, Loader2, Check } from "lucide-react";
import { Text, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Avatar from "./Avatar";

interface UserResult {
  id: string;
  username: string;
  avatar?: string | null;
}

interface Props {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

export default function CreateGroupModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [selected, setSelected] = useState<UserResult[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/api/users/search?q=${encodeURIComponent(trimmed)}`);
        setResults((res.data as UserResult[]).filter((u) => u.id !== user?.id));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, user?.id]);

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/api/messages/conversations/group", {
        name: groupName.trim(),
        memberIds: selected.map((u) => u.id),
      }).then((r) => r.data as { id: string }),
    onSuccess: (data) => onCreated(data.id),
  });

  function toggleUser(u: UserResult) {
    setSelected((prev) =>
      prev.find((s) => s.id === u.id) ? prev.filter((s) => s.id !== u.id) : [...prev, u]
    );
  }

  const canCreate = groupName.trim().length > 0 && selected.length >= 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Flex align="center" justify="between" className="px-4 py-3 border-b border-white/8 shrink-0">
          <Flex align="center" gap="2">
            <Users size={15} className="text-violet-400" />
            <span className="text-sm font-semibold text-white">New group</span>
          </Flex>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/8 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </Flex>

        {/* Group name */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name…"
            maxLength={64}
            className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none placeholder-gray-600 focus:border-violet-500/50 transition-colors"
          />
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {selected.map((u) => (
              <button
                key={u.id}
                onClick={() => toggleUser(u)}
                className="flex items-center gap-1.5 bg-violet-600/30 border border-violet-500/30 rounded-full pl-1.5 pr-2 py-0.5 text-xs text-violet-300 hover:bg-violet-600/50 transition-colors"
              >
                <span className="w-4 h-4 rounded-full overflow-hidden shrink-0">
                  <Avatar src={u.avatar ?? undefined} username={u.username} size="sm" />
                </span>
                {u.username}
                <X size={10} className="ml-0.5 opacity-70" />
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <Flex align="center" gap="2" className="px-4 py-2.5 border-y border-white/8 shrink-0">
          <Search size={13} className="text-gray-500 shrink-0" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
          />
          {searching && <Loader2 size={13} className="animate-spin text-gray-500 shrink-0" />}
        </Flex>

        {/* Results */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {query.trim() && !searching && results.length === 0 && (
            <Text as="p" size="1" color="gray" className="py-8 text-center">No users found</Text>
          )}
          {!query.trim() && selected.length === 0 && (
            <Text as="p" size="1" color="gray" className="py-8 text-center">Search for people to add</Text>
          )}
          {results.map((u) => {
            const isSelected = !!selected.find((s) => s.id === u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggleUser(u)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <Avatar src={u.avatar ?? undefined} username={u.username} size="sm" />
                <span className="flex-1 text-sm text-white truncate">{u.username}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? "bg-violet-600 border-violet-600" : "border-gray-600"
                }`}>
                  {isSelected && <Check size={11} className="text-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/8 shrink-0">
          <button
            disabled={!canCreate || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Creating…</>
            ) : (
              <>Create group {selected.length > 0 && `(${selected.length + 1})`}</>
            )}
          </button>
          {createMutation.isError && (
            <Text as="p" size="1" color="red" className="mt-2 text-center">Failed to create group. Try again.</Text>
          )}
        </div>
      </div>
    </div>
  );
}
