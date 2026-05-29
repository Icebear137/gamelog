"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Search, X, Loader2, Gamepad2 } from "lucide-react";
import { Text, Box } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { ChatMessageGame } from "@/lib/types";

interface Props {
  onSelect: (game: ChatMessageGame) => void;
  onClose: () => void;
}

export function GamePicker({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatMessageGame[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data: games } = await api.get<ChatMessageGame[]>(
          `/api/messages/games?q=${encodeURIComponent(q)}`
        );
        setResults(games);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
        <Search size={14} className="text-gray-500 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games in library…"
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
        />
        {loading && <Loader2 size={13} className="animate-spin text-gray-500 shrink-0" />}
        <button onClick={onClose} className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto">
        {!query.trim() && <Text as="p" size="1" color="gray" className="py-8 text-center">Type a game name to search</Text>}
        {query.trim() && !loading && results.length === 0 && (
          <Text as="p" size="1" color="gray" className="py-8 text-center">No games found in library</Text>
        )}
        {results.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelect(game)}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
          >
            {game.coverImage ? (
              <div className="relative w-9 h-12 rounded-lg overflow-hidden shrink-0">
                <Image src={game.coverImage} alt={game.name} fill className="object-cover" sizes="36px" />
              </div>
            ) : (
              <div className="w-9 h-12 bg-white/8 rounded-lg shrink-0 flex items-center justify-center">
                <Gamepad2 size={16} className="text-gray-600" />
              </div>
            )}
            <Box minWidth="0">
              <Text as="p" size="2" weight="medium" className="truncate">{game.name}</Text>
              {game.releaseYear && <Text as="p" size="1" color="gray" className="mt-0.5">{game.releaseYear}</Text>}
            </Box>
          </button>
        ))}
      </div>
    </div>
  );
}
