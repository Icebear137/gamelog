"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tag, Plus, X, Check } from "lucide-react";
import { Heading, Flex } from "@radix-ui/themes";
import { useAuth } from "@/lib/auth-context";
import { getGameTagsService, addGameTagService, voteGameTagService } from "@/services/game.service";
import { dispatchToast } from "@/lib/toast";

interface GameTag {
  id: string;
  tag: string;
  votes: number;
  votedByMe: boolean;
}

const SUGGESTIONS = [
  "story-rich", "open-world", "difficult", "relaxing", "co-op",
  "atmospheric", "emotional", "funny", "horror", "short",
  "long", "roguelike", "stealth", "puzzle", "sandbox",
  "multiplayer", "action", "rpg", "platformer", "survival",
];

interface Props { rawgId: string }

export function GameTagsSection({ rawgId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showInput, setShowInput] = useState(false);
  const [input, setInput] = useState("");
  const [filtered, setFiltered] = useState<string[]>([]);

  const queryKey = ["game-tags", rawgId];
  const { data: tags = [] } = useQuery<GameTag[]>({
    queryKey,
    queryFn: () => getGameTagsService(parseInt(rawgId)),
    staleTime: 60_000,
  });

  const voteMutation = useMutation({
    mutationFn: (tagId: string) => voteGameTagService(tagId),
    onSuccess: (res, tagId) => {
      qc.setQueryData(queryKey, (old: GameTag[] | undefined) =>
        old?.map((t) => t.id === tagId ? { ...t, votes: res.votes, votedByMe: res.voted } : t)
      );
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const addMutation = useMutation({
    mutationFn: (tag: string) => addGameTagService(parseInt(rawgId), tag),
    onSuccess: (res) => {
      qc.setQueryData(queryKey, (old: GameTag[] | undefined) => {
        if (!old) return [res];
        const exists = old.find((t) => t.id === res.id);
        return exists ? old.map((t) => t.id === res.id ? res : t) : [...old, res];
      });
      setInput(""); setShowInput(false); setFiltered([]);
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Invalid tag", "error"),
  });

  function handleInput(val: string) {
    const v = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setInput(v);
    if (v.length >= 2) {
      setFiltered(SUGGESTIONS.filter((s) => s.includes(v) && !tags.find((t) => t.tag === s)).slice(0, 6));
    } else {
      setFiltered(SUGGESTIONS.filter((s) => !tags.find((t) => t.tag === s)).slice(0, 6));
    }
  }

  function submit(tag?: string) {
    const t = (tag ?? input).trim();
    if (t.length >= 2) addMutation.mutate(t);
  }

  return (
    <div>
      <Flex align="center" gap="2" className="mb-3">
        <Tag size={16} className="text-violet-400" />
        <Heading size="4" as="h2">Tags</Heading>
      </Flex>

      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t.id}
            onClick={() => user && voteMutation.mutate(t.id)}
            disabled={!user || voteMutation.isPending}
            title={user ? (t.votedByMe ? "Remove your vote" : "Vote for this tag") : "Sign in to vote"}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all disabled:cursor-default ${
              t.votedByMe
                ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                : "bg-white/5 border-white/10 text-gray-400 hover:border-violet-500/40 hover:text-gray-200"
            }`}
          >
            {t.votedByMe && <Check size={10} className="text-violet-400" />}
            {t.tag}
            <span className={`${t.votedByMe ? "text-violet-400" : "text-gray-600"}`}>{t.votes}</span>
          </button>
        ))}

        {/* Add tag button */}
        {user && !showInput && (
          <button
            onClick={() => { setShowInput(true); setFiltered(SUGGESTIONS.filter((s) => !tags.find((t) => t.tag === s)).slice(0, 6)); }}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs text-gray-600 border border-dashed border-white/15 hover:border-violet-500/40 hover:text-gray-300 transition-colors"
          >
            <Plus size={11} /> Add tag
          </button>
        )}
      </div>

      {/* Tag input */}
      {showInput && (
        <div className="mt-3 relative">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); submit(); }
                if (e.key === "Escape") { setShowInput(false); setInput(""); }
              }}
              placeholder="e.g. relaxing, co-op, hard…"
              maxLength={30}
              className="flex-1 bg-white/5 border border-white/10 focus:border-violet-500 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
            />
            <button
              onClick={() => submit()}
              disabled={input.length < 2 || addMutation.isPending}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs rounded-lg transition-colors"
            >
              Add
            </button>
            <button onClick={() => { setShowInput(false); setInput(""); }} className="p-1.5 text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Suggestions dropdown */}
          {filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-xl z-10">
              {filtered.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  disabled={addMutation.isPending}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/8 transition-colors disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tags.length === 0 && !showInput && (
        <p className="text-xs text-gray-600 mt-1">
          {user ? "No tags yet — be the first to tag this game!" : "No tags yet."}
        </p>
      )}
    </div>
  );
}
