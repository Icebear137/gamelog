"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Gamepad2, Users, Star, ArrowRight, X } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import Avatar from "./Avatar";

type Tab = "games" | "players";

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

const TAB_CLS =
  "flex items-center gap-[5px] px-3.5 py-1.5 bg-transparent font-outfit text-xs font-semibold cursor-pointer rounded-t-[6px] border-b-2 -mb-px transition-[color] duration-150 hover:text-gl-subtext";

const ROW_CLS =
  "group/row flex items-center gap-2.5 px-3.5 py-[7px] cursor-pointer transition-[background] duration-[120ms] hover:bg-white/[0.05]";

const TITLE_CLS =
  "text-[13px] font-semibold text-gl-text m-0 mb-[3px] whitespace-nowrap overflow-hidden text-ellipsis transition-[color] duration-[120ms] group-hover/row:text-gx-amber";

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function NavSearchDropdown() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("games");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQ = useDebounce(query.trim(), 350);
  const hasQuery = debouncedQ.length >= 2;

  const { data: games = [], isFetching: gamesLoading } = useQuery<GameResult[]>({
    queryKey: ["nav-search-games", debouncedQ],
    queryFn: () =>
      api.get("/api/games/search", { params: { q: debouncedQ } }).then((r) => r.data),
    enabled: hasQuery && tab === "games",
    staleTime: 30_000,
  });

  const { data: players = [], isFetching: playersLoading } = useQuery<UserResult[]>({
    queryKey: ["nav-search-players", debouncedQ],
    queryFn: () =>
      api.get("/api/users/search", { params: { q: debouncedQ } }).then((r) => r.data),
    enabled: hasQuery && tab === "players",
    staleTime: 30_000,
  });

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}&tab=${tab}`);
    setOpen(false);
    inputRef.current?.blur();
  }

  function goGame(game: GameResult) {
    router.push(`/game/${game.rawgId}`);
    setOpen(false);
    setQuery("");
  }

  function goPlayer(player: UserResult) {
    router.push(`/user/${player.username}`);
    setOpen(false);
    setQuery("");
  }

  function goAll() {
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}&tab=${tab}`);
    setOpen(false);
  }

  const showDropdown = open && query.trim().length >= 1;
  const isLoading = tab === "games" ? gamesLoading : playersLoading;

  return (
    <div className="flex-1 max-w-[520px] mx-auto relative h-[38px] z-[100]" ref={wrapRef}>
      {/* Input */}
      <form className="relative w-full h-full" onSubmit={handleSubmit}>
        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-[#64748b] pointer-events-none flex items-center z-[1]">
          <Search size={14} />
        </span>
        <input
          ref={inputRef}
          type="text"
          className={clsx(
            "absolute inset-0 w-full h-full bg-white/[0.06] border py-0 pl-9 pr-8 font-outfit text-[13px] text-gl-text outline-none transition-[border-color,background,box-shadow,border-radius] duration-[180ms] placeholder:text-[#475569] focus:bg-white/[0.08]",
            showDropdown
              ? "border-gx-amber/45 rounded-[10px_10px_0_0] shadow-[0_0_0_3px_rgba(232,147,42,0.08)]"
              : "border-white/[0.09] rounded-[10px]"
          )}
          placeholder="Search games, players…"
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            type="button"
            className="absolute right-[9px] top-1/2 -translate-y-1/2 bg-white/[0.08] text-gl-subtext cursor-pointer p-[3px] w-[18px] h-[18px] flex items-center justify-center rounded-[4px] transition-[background,color] duration-150 hover:bg-white/[0.14] hover:text-gl-text"
            tabIndex={-1}
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
          >
            <X size={11} />
          </button>
        )}
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 bg-[rgba(8,10,18,0.97)] backdrop-blur-[24px] border border-gx-amber/30 border-t-gx-amber/20 rounded-b-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.7),0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">

          {/* Tab switcher */}
          <div className="flex gap-0.5 px-3 pt-2 pb-0 border-b border-white/[0.06]">
            <button
              className={clsx(
                TAB_CLS,
                tab === "games"
                  ? "text-gx-amber border-b-gx-amber"
                  : "text-[#475569] border-b-transparent"
              )}
              onClick={() => setTab("games")}
              type="button"
            >
              <Gamepad2 size={11} /> Games
            </button>
            <button
              className={clsx(
                TAB_CLS,
                tab === "players"
                  ? "text-gx-amber border-b-gx-amber"
                  : "text-[#475569] border-b-transparent"
              )}
              onClick={() => setTab("players")}
              type="button"
            >
              <Users size={11} /> Players
            </button>
          </div>

          {/* Results body */}
          <div className="max-h-[300px] overflow-y-auto px-0 py-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.08)_transparent]">

            {/* Waiting for 2 chars */}
            {!hasQuery && (
              <p className="text-xs text-[#475569] text-center p-[18px] m-0">Keep typing to search…</p>
            )}

            {/* Skeleton */}
            {hasQuery && isLoading && (
              <div className="px-3 py-2 flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-white/[0.04] animate-gx-shimmer" />
                ))}
              </div>
            )}

            {/* Empty */}
            {hasQuery && !isLoading && (
              (tab === "games" ? games : players).length === 0
            ) && (
              <p className="text-xs text-[#475569] text-center p-[18px] m-0">No {tab} found for "{debouncedQ}"</p>
            )}

            {/* Game results */}
            {hasQuery && !isLoading && tab === "games" &&
              games.slice(0, 6).map((game) => (
                <div key={game.rawgId} className={ROW_CLS} onClick={() => goGame(game)}>
                  <div className="w-[34px] h-[46px] rounded-md overflow-hidden bg-white/[0.05] shrink-0 flex items-center justify-center text-[#475569]">
                    {game.coverImage
                      ? <img src={game.coverImage} alt={game.name} loading="lazy" className="block w-full h-full object-cover" />
                      : <Gamepad2 size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={TITLE_CLS}>{game.name}</p>
                    <div className="flex items-center gap-[5px] text-[11px] text-[#475569]">
                      {game.releaseYear && <span>{game.releaseYear}</span>}
                      {game.genres[0] && (
                        <span className="bg-white/[0.07] px-1.5 py-px rounded-[4px] text-[10px]">{game.genres[0]}</span>
                      )}
                    </div>
                  </div>
                  {(game.rawgRating ?? 0) > 0 && (
                    <span className="flex items-center gap-[3px] text-[11px] font-bold text-gl-amber shrink-0">
                      <Star size={9} fill="currentColor" />
                      {game.rawgRating!.toFixed(1)}
                    </span>
                  )}
                </div>
              ))
            }

            {/* Player results */}
            {hasQuery && !isLoading && tab === "players" &&
              players.slice(0, 6).map((player) => (
                <div key={player.id} className={ROW_CLS} onClick={() => goPlayer(player)}>
                  <Avatar src={player.avatar} username={player.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className={TITLE_CLS}>{player.username}</p>
                    <p className="text-[11px] text-[#475569] m-0">
                      {player._count.gameEntries} games · {player._count.followers} followers
                    </p>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Footer: view all */}
          {hasQuery && !isLoading && (tab === "games" ? games : players).length > 0 && (
            <button
              className="flex items-center justify-between w-full px-3.5 py-2.5 bg-transparent border-t border-white/[0.06] text-[#64748b] font-outfit text-xs cursor-pointer transition-[color,background] duration-150 hover:text-gx-amber hover:bg-gx-amber/[0.04]"
              onClick={goAll}
              type="button"
            >
              <span>View all results for <strong className="text-gl-subtext font-semibold">"{query.trim()}"</strong></span>
              <ArrowRight size={13} />
            </button>
          )}

        </div>
      )}
    </div>
  );
}
