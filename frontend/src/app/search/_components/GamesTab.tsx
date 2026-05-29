"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gamepad2, SlidersHorizontal, X, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import * as Select from "@radix-ui/react-select";
import { Text, Flex, Box } from "@radix-ui/themes";
import { ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import WantToPlayButton from "@/components/WantToPlayButton";

interface GameResult {
  rawgId: number;
  name: string;
  coverImage?: string;
  releaseYear?: number;
  genres: string[];
  rawgRating?: number;
}

interface Props { debouncedQ: string }

export function GamesTab({ debouncedQ }: Props) {
  const router = useRouter();
  const [genreFilter, setGenreFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const hasFilters = !!(genreFilter || yearFilter);

  const { data: genres = [] } = useQuery<string[]>({
    queryKey: ["game-genres"],
    queryFn: () => api.get("/api/games/genres").then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const enabled = debouncedQ.length > 1 || hasFilters;
  const params = new URLSearchParams();
  if (debouncedQ) params.set("q", debouncedQ);
  if (genreFilter) params.set("genre", genreFilter);
  if (yearFilter) params.set("year", yearFilter);

  const { data: games = [], isFetching } = useQuery<GameResult[]>({
    queryKey: ["search-games", debouncedQ, genreFilter, yearFilter],
    queryFn: () => api.get(`/api/games/search?${params.toString()}`).then((r) => r.data),
    enabled,
  });

  return (
    <>
      <Flex align="center" gap="2" className="mb-4">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            showFilters || hasFilters
              ? "border-violet-600 text-violet-400 bg-violet-600/10"
              : "border-white/15 text-gray-400 hover:border-white/20"
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {hasFilters && (
            <span className="text-xs bg-violet-600 text-white rounded-full px-1.5">
              {[genreFilter, yearFilter].filter(Boolean).length}
            </span>
          )}
        </button>
        {hasFilters && (
          <button
            onClick={() => { setGenreFilter(""); setYearFilter(""); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <X size={12} />Clear
          </button>
        )}
      </Flex>

      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-5 p-4 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl">
          <div className="flex-1 min-w-40 space-y-1">
            <Text as="label" size="1" color="gray">Genre</Text>
            <Select.Root value={genreFilter || "all"} onValueChange={(v) => setGenreFilter(v === "all" ? "" : v)}>
              <Select.Trigger className="w-full flex items-center gap-2 bg-white/8 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none transition-colors">
                <Select.Value placeholder="Any genre" />
                <Select.Icon className="ml-auto"><ChevronDown size={14} className="text-gray-500" /></Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 shadow-xl z-50 max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                  <Select.Viewport>
                    <Select.Item value="all" className="px-3 py-2 text-sm text-gray-500 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8">
                      <Select.ItemText>Any genre</Select.ItemText>
                    </Select.Item>
                    {genres.map((g) => (
                      <Select.Item key={g} value={g} className="px-3 py-2 text-sm text-gray-300 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8 data-[state=checked]:text-white">
                        <Select.ItemText>{g}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          <div className="flex-1 min-w-32 space-y-1">
            <Text as="label" size="1" color="gray">Release Year</Text>
            <input
              type="number"
              min={1980}
              max={new Date().getFullYear() + 2}
              placeholder="e.g. 2023"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
            />
          </div>
        </div>
      )}

      {isFetching && <Text as="p" size="2" color="gray">Searching...</Text>}
      {enabled && !isFetching && games.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
          <Text as="p" size="2" color="gray">No games found{debouncedQ ? ` for "${debouncedQ}"` : ""}</Text>
        </div>
      )}
      {!enabled && (
        <div className="text-center py-16 text-gray-500">
          <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
          <Text as="p" size="2" color="gray">Type a game name or use filters to browse</Text>
        </div>
      )}

      <Flex direction="column" gap="3">
        {games.map((game) => (
          <Slot
            key={game.rawgId}
            role="link"
            tabIndex={0}
            className="cursor-pointer outline-none block"
            onClick={() => router.push(`/game/${game.rawgId}`)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
            }}
          >
            <Flex align="center" gap="4" className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-3 hover:border-violet-700 transition-colors">
              {game.coverImage ? (
                <img src={game.coverImage} alt={game.name} className="w-14 shrink-0 object-cover rounded-lg" style={{ height: "4.5rem" }} />
              ) : (
                <div className="w-14 shrink-0 bg-white/8 rounded-lg flex items-center justify-center" style={{ height: "4.5rem" }}>
                  <Gamepad2 size={20} className="text-gray-600" />
                </div>
              )}
              <Box flexGrow="1" minWidth="0">
                <Text as="p" size="2" className="font-semibold">{game.name}</Text>
                <Text as="p" size="1" color="gray" className="mt-0.5">{game.releaseYear ?? "—"}</Text>
                <div className="flex flex-wrap gap-1 mt-1">
                  {game.genres.slice(0, 3).map((g) => (
                    <span key={g} className="text-xs text-gray-500 bg-white/8 px-2 py-0.5 rounded-full">{g}</span>
                  ))}
                </div>
              </Box>
              <Flex align="center" gap="3" className="shrink-0" onClick={(e) => e.stopPropagation()}>
                {game.rawgRating != null && (
                  <Flex align="center" gap="1" className="text-yellow-400">
                    <Star size={14} fill="currentColor" />
                    <Text as="span" size="2" className="font-bold">{game.rawgRating.toFixed(1)}</Text>
                  </Flex>
                )}
                <WantToPlayButton rawgId={game.rawgId} gameName={game.name} />
              </Flex>
            </Flex>
          </Slot>
        ))}
      </Flex>
    </>
  );
}
