"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Star, Gamepad2, Users, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GameEntry } from "@/lib/types";
import * as Tabs from "@radix-ui/react-tabs";
import Avatar from "@/components/Avatar";
import WantToPlayButton from "@/components/WantToPlayButton";

interface GameResult {
  rawgId: number;
  name: string;
  coverImage?: string;
  releaseYear?: number;
  genres: string[];
  rawgRating?: number;
}

interface UserResult {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  _count: { followers: number; gameEntries: number };
}

const RECENT_DAYS_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export default function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Game filters
  const [genreFilter, setGenreFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [showGameFilters, setShowGameFilters] = useState(false);

  // User filters
  const [recentDays, setRecentDays] = useState("");
  const [showUserFilters, setShowUserFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(timer);
  }, [q]);

  const hasGameFilters = !!(genreFilter || yearFilter);
  const hasUserFilters = !!recentDays;

  // Fetch available genres from local DB
  const { data: genres = [] } = useQuery<string[]>({
    queryKey: ["game-genres"],
    queryFn: () => api.get("/api/games/genres").then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  // Build game search URL
  const gameSearchEnabled = debouncedQ.length > 1 || hasGameFilters;
  const gameSearchParams = new URLSearchParams();
  if (debouncedQ) gameSearchParams.set("q", debouncedQ);
  if (genreFilter) gameSearchParams.set("genre", genreFilter);
  if (yearFilter) gameSearchParams.set("year", yearFilter);

  const { data: games = [], isFetching: fetchingGames } = useQuery<GameResult[]>({
    queryKey: ["search-games", debouncedQ, genreFilter, yearFilter],
    queryFn: () =>
      api.get(`/api/games/search?${gameSearchParams.toString()}`).then((r) => r.data),
    enabled: gameSearchEnabled,
  });

  // Build user search URL
  const userSearchEnabled = debouncedQ.length > 1 || hasUserFilters;
  const userSearchParams = new URLSearchParams();
  if (debouncedQ) userSearchParams.set("q", debouncedQ);
  if (recentDays) userSearchParams.set("recentDays", recentDays);

  const { data: users = [], isFetching: fetchingUsers } = useQuery<UserResult[]>({
    queryKey: ["search-users", debouncedQ, recentDays],
    queryFn: () =>
      api.get(`/api/users/search?${userSearchParams.toString()}`).then((r) => r.data),
    enabled: userSearchEnabled,
  });

  useQuery<GameEntry[]>({
    queryKey: ["my-entries"],
    queryFn: () => api.get("/api/entries/me").then((r) => r.data),
    enabled: !!user,
  });

  function clearGameFilters() {
    setGenreFilter("");
    setYearFilter("");
  }

  function clearUserFilters() {
    setRecentDays("");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Search</h1>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
          placeholder="Search games or players..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>

      <Tabs.Root defaultValue="games">
        <Tabs.List className="flex gap-1 mb-5 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-1 w-fit">
          <Tabs.Trigger
            value="games"
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg text-gray-400 data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-colors"
          >
            <Gamepad2 size={14} />
            Games
            {games.length > 0 && (
              <span className="text-xs opacity-70">({games.length})</span>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="players"
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg text-gray-400 data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-colors"
          >
            <Users size={14} />
            Players
            {users.length > 0 && (
              <span className="text-xs opacity-70">({users.length})</span>
            )}
          </Tabs.Trigger>
        </Tabs.List>

        {/* ───── GAMES TAB ───── */}
        <Tabs.Content value="games">
          {/* Filter toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setShowGameFilters((v) => !v)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                showGameFilters || hasGameFilters
                  ? "border-violet-600 text-violet-400 bg-violet-600/10"
                  : "border-white/15 text-gray-400 hover:border-white/20"
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {hasGameFilters && (
                <span className="text-xs bg-violet-600 text-white rounded-full px-1.5">
                  {[genreFilter, yearFilter].filter(Boolean).length}
                </span>
              )}
            </button>
            {hasGameFilters && (
              <button
                onClick={clearGameFilters}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <X size={12} />
                Clear
              </button>
            )}
          </div>

          {showGameFilters && (
            <div className="flex flex-wrap gap-3 mb-5 p-4 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl">
              {/* Genre filter */}
              <div className="flex-1 min-w-40 space-y-1">
                <label className="text-xs text-gray-500">Genre</label>
                <Select.Root
                  value={genreFilter || "all"}
                  onValueChange={(v) => setGenreFilter(v === "all" ? "" : v)}
                >
                  <Select.Trigger className="w-full flex items-center gap-2 bg-white/8 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none transition-colors">
                    <Select.Value placeholder="Any genre" />
                    <Select.Icon className="ml-auto">
                      <ChevronDown size={14} className="text-gray-500" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 shadow-xl z-50 max-h-60 overflow-y-auto"
                      position="popper"
                      sideOffset={4}
                    >
                      <Select.Viewport>
                        <Select.Item
                          value="all"
                          className="px-3 py-2 text-sm text-gray-500 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8"
                        >
                          <Select.ItemText>Any genre</Select.ItemText>
                        </Select.Item>
                        {genres.map((g) => (
                          <Select.Item
                            key={g}
                            value={g}
                            className="px-3 py-2 text-sm text-gray-300 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8 data-[state=checked]:text-white"
                          >
                            <Select.ItemText>{g}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              {/* Year filter */}
              <div className="flex-1 min-w-32 space-y-1">
                <label className="text-xs text-gray-500">Release Year</label>
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

          {fetchingGames && <div className="text-gray-500 text-sm">Searching...</div>}
          {gameSearchEnabled && !fetchingGames && games.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>No games found{debouncedQ ? ` for "${debouncedQ}"` : ""}</p>
            </div>
          )}
          {!gameSearchEnabled && (
            <div className="text-center py-16 text-gray-500">
              <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Type a game name or use filters to browse</p>
            </div>
          )}

          <div className="space-y-3">
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
                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-3 hover:border-violet-700 transition-colors">
                  {game.coverImage ? (
                    <img
                      src={game.coverImage}
                      alt={game.name}
                      className="w-14 shrink-0 object-cover rounded-lg"
                      style={{ height: "4.5rem" }}
                    />
                  ) : (
                    <div
                      className="w-14 shrink-0 bg-white/8 rounded-lg flex items-center justify-center"
                      style={{ height: "4.5rem" }}
                    >
                      <Gamepad2 size={20} className="text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{game.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{game.releaseYear ?? "—"}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {game.genres.slice(0, 3).map((g) => (
                        <span key={g} className="text-xs text-gray-500 bg-white/8 px-2 py-0.5 rounded-full">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {game.rawgRating != null && (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star size={14} fill="currentColor" />
                        <span className="text-sm font-bold">{game.rawgRating.toFixed(1)}</span>
                      </div>
                    )}
                    <WantToPlayButton rawgId={game.rawgId} gameName={game.name} />
                  </div>
                </div>
              </Slot>
            ))}
          </div>
        </Tabs.Content>

        {/* ───── PLAYERS TAB ───── */}
        <Tabs.Content value="players">
          {/* Filter toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setShowUserFilters((v) => !v)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                showUserFilters || hasUserFilters
                  ? "border-violet-600 text-violet-400 bg-violet-600/10"
                  : "border-white/15 text-gray-400 hover:border-white/20"
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {hasUserFilters && (
                <span className="text-xs bg-violet-600 text-white rounded-full px-1.5">1</span>
              )}
            </button>
            {hasUserFilters && (
              <button
                onClick={clearUserFilters}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <X size={12} />
                Clear
              </button>
            )}
          </div>

          {showUserFilters && (
            <div className="flex flex-wrap gap-3 mb-5 p-4 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl">
              <div className="flex-1 min-w-40 space-y-1">
                <label className="text-xs text-gray-500">Recently Active</label>
                <Select.Root
                  value={recentDays || "any"}
                  onValueChange={(v) => setRecentDays(v === "any" ? "" : v)}
                >
                  <Select.Trigger className="w-full flex items-center gap-2 bg-white/8 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none transition-colors">
                    <Select.Value placeholder="Any time" />
                    <Select.Icon className="ml-auto">
                      <ChevronDown size={14} className="text-gray-500" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 shadow-xl z-50"
                      position="popper"
                      sideOffset={4}
                    >
                      <Select.Viewport>
                        <Select.Item
                          value="any"
                          className="px-3 py-2 text-sm text-gray-500 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8"
                        >
                          <Select.ItemText>Any time</Select.ItemText>
                        </Select.Item>
                        {RECENT_DAYS_OPTIONS.map((opt) => (
                          <Select.Item
                            key={opt.value}
                            value={opt.value}
                            className="px-3 py-2 text-sm text-gray-300 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8 data-[state=checked]:text-white"
                          >
                            <Select.ItemText>{opt.label}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            </div>
          )}

          {fetchingUsers && <div className="text-gray-500 text-sm">Searching...</div>}
          {userSearchEnabled && !fetchingUsers && users.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>No players found{debouncedQ ? ` for "${debouncedQ}"` : ""}</p>
            </div>
          )}
          {!userSearchEnabled && (
            <div className="text-center py-16 text-gray-500">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Type a username or filter by recent activity</p>
            </div>
          )}

          <div className="space-y-2">
            {users.map((u) => (
              <Slot
                key={u.id}
                role="link"
                tabIndex={0}
                className="cursor-pointer outline-none block"
                onClick={() => router.push(`/user/${u.username}`)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") router.push(`/user/${u.username}`);
                }}
              >
                <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-3 hover:border-violet-700 transition-colors">
                  <Avatar src={u.avatar} username={u.username} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{u.username}</p>
                    {u.bio && <p className="text-gray-500 text-xs truncate">{u.bio}</p>}
                  </div>
                  <div className="text-right shrink-0 text-xs text-gray-500">
                    <p>{u._count.followers} followers</p>
                    <p>{u._count.gameEntries} games</p>
                  </div>
                </div>
              </Slot>
            ))}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

