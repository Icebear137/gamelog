"use client";

import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Star, Gamepad2, Flame, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Heading, Text } from "@radix-ui/themes";
import { api } from "@/lib/api";

interface GamePreview {
  rawgId: number;
  name: string;
  coverImage: string | null;
  released: string | null;
  rawgRating: number;
  genres: string[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function GameCard({ game, upcoming }: { game: GamePreview; upcoming?: boolean }) {
  const router = useRouter();
  return (
    <div
      role="link"
      tabIndex={0}
      className="flex-none w-36 cursor-pointer group outline-none"
      onClick={() => router.push(`/game/${game.rawgId}`)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`); }}
    >
      <div className="rounded-lg overflow-hidden bg-white/5 border border-white/8">
        {game.coverImage ? (
          <img
            src={game.coverImage}
            alt={game.name}
            loading="lazy"
            className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-24 flex items-center justify-center">
            <Gamepad2 size={24} className="text-gray-600" />
          </div>
        )}
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="text-xs font-medium text-white line-clamp-2 leading-tight group-hover:text-violet-300 transition-colors">
          {game.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {!upcoming && game.rawgRating > 0 && (
            <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
              <Star size={10} fill="currentColor" />
              {game.rawgRating.toFixed(1)}
            </span>
          )}
          {game.released && (
            <Text as="span" size="1" color="gray">{formatDate(game.released)}</Text>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-none w-36">
      <div className="w-full h-24 rounded-lg bg-white/5 animate-pulse" />
      <div className="mt-2 h-3 bg-white/5 rounded animate-pulse" />
      <div className="mt-1 h-2.5 w-2/3 bg-white/5 rounded animate-pulse" />
    </div>
  );
}

// Scroll 3 cards + gaps at a time
const SCROLL_AMOUNT = 3 * (144 + 12);

const AUTO_DELAY = 3500;

function GameRow({
  title, icon, games, upcoming, isLoading,
}: {
  title: string;
  icon: React.ReactNode;
  games: GamePreview[];
  upcoming?: boolean;
  isLoading: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const hoveredRef = useRef(false);
  const pausedRef  = useRef(false);

  function updateArrows() {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  // re-evaluate whenever data changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games]);

  // Auto-slide: advance every AUTO_DELAY ms, loop back to start at the end
  useEffect(() => {
    const id = setInterval(() => {
      if (hoveredRef.current || pausedRef.current) return;
      const el = scrollRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
      }
    }, AUTO_DELAY);
    return () => clearInterval(id);
  }, []);

  function slide(dir: -1 | 1) {
    // pause auto-slide for 6 s after manual navigation
    pausedRef.current = true;
    setTimeout(() => { pausedRef.current = false; }, 6000);
    scrollRef.current?.scrollBy({ left: dir * SCROLL_AMOUNT, behavior: "smooth" });
  }

  return (
    <div
      onMouseEnter={() => { hoveredRef.current = true; }}
      onMouseLeave={() => { hoveredRef.current = false; }}
    >
      {/* Header row: title + arrows */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <Heading size="3" as="h2">{title}</Heading>
        </div>
        {!isLoading && (
          <div className="flex gap-1">
            <button
              onClick={() => slide(-1)}
              disabled={!canLeft}
              className="p-1.5 rounded-full bg-white/5 hover:bg-violet-600/30 border border-white/8 text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => slide(1)}
              disabled={!canRight}
              className="p-1.5 rounded-full bg-white/5 hover:bg-violet-600/30 border border-white/8 text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Scroll container with edge fades */}
      <div className="relative">
        {canLeft && (
          <div className="absolute left-0 top-0 bottom-2 w-10 bg-linear-to-r from-black/60 to-transparent z-10 pointer-events-none" />
        )}
        {canRight && (
          <div className="absolute right-0 top-0 bottom-2 w-10 bg-linear-to-l from-black/60 to-transparent z-10 pointer-events-none" />
        )}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
        >
          {isLoading
            ? Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
            : games.map((g) => <GameCard key={g.rawgId} game={g} upcoming={upcoming} />)}
        </div>
      </div>
    </div>
  );
}

const ONE_HOUR = 60 * 60 * 1000;

export default function NewAndUpcoming() {
  const { data: newReleases = [], isLoading: loadingNew } = useQuery<GamePreview[]>({
    queryKey: ["new-releases"],
    queryFn: () => api.get("/api/games/new-releases").then((r) => r.data),
    staleTime: ONE_HOUR,
  });

  const { data: upcoming = [], isLoading: loadingUpcoming } = useQuery<GamePreview[]>({
    queryKey: ["upcoming-games"],
    queryFn: () => api.get("/api/games/upcoming").then((r) => r.data),
    staleTime: ONE_HOUR,
  });

  return (
    <div className="bg-white/3 border border-white/6 rounded-2xl p-4 space-y-5">
      <GameRow
        title="New Releases"
        icon={<Flame size={16} className="text-orange-400" />}
        games={newReleases}
        isLoading={loadingNew}
      />
      <div className="h-px bg-white/6" />
      <GameRow
        title="Coming Soon"
        icon={<CalendarDays size={16} className="text-blue-400" />}
        games={upcoming}
        upcoming
        isLoading={loadingUpcoming}
      />
    </div>
  );
}
