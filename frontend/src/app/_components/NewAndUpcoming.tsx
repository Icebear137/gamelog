"use client";

import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Star, Gamepad2, Flame, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
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

function GameTile({ game, upcoming }: { game: GamePreview; upcoming?: boolean }) {
  const router = useRouter();
  return (
    <div
      className="shrink-0 w-[148px] cursor-pointer outline-none transition-transform hover:-translate-y-[3px] group"
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/game/${game.rawgId}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
      }}
    >
      <div className="relative w-full h-[100px] rounded-[9px] overflow-hidden bg-[#080910] border border-gl-border">
        {game.coverImage ? (
          <>
            <img
              src={game.coverImage}
              alt={game.name}
              loading="lazy"
              className="w-full h-full object-cover block transition-transform duration-[350ms] ease-in group-hover:scale-[1.07]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(0,0,0,0.5)] pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 size={22} color="rgba(255,255,255,0.12)" />
          </div>
        )}
        {!upcoming && game.rawgRating > 0 && (
          <div className="absolute top-[5px] right-[5px] bg-[rgba(0,0,0,0.72)] border border-[rgba(245,158,11,0.28)] rounded-[5px] px-[5px] py-[2px] flex items-center gap-[3px] font-outfit text-[10px] font-bold text-gl-amber backdrop-blur-sm">
            <Star size={9} fill="currentColor" />
            {game.rawgRating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="px-0.5 pt-2">
        <p className="font-outfit text-[12px] font-semibold text-gl-text leading-[1.35] line-clamp-2 overflow-hidden transition-colors group-hover:text-gx-amber">{game.name}</p>
        {game.released && (
          <p className="font-outfit text-[10px] text-gl-muted mt-[3px]">{formatDate(game.released)}</p>
        )}
      </div>
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="shrink-0 w-[148px]" style={{ pointerEvents: "none" }}>
      <div className="w-full h-[100px] rounded-[9px] bg-white/[0.05] animate-hm-shimmer" />
      <div className="h-[11px] rounded-[4px] mt-2 bg-white/[0.05] animate-hm-shimmer" />
      <div className="h-[9px] w-[55%] rounded-[4px] mt-[5px] bg-white/[0.05] animate-hm-shimmer" />
    </div>
  );
}

// Scroll 3 tiles (148px + 10px gap) at a time
const SCROLL_AMOUNT = 3 * (148 + 10);
const AUTO_DELAY    = 3500;

function GameRow({
  title,
  icon,
  games,
  upcoming,
  isLoading,
}: {
  title: string;
  icon: React.ReactNode;
  games: GamePreview[];
  upcoming?: boolean;
  isLoading: boolean;
}) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef(false);
  const pausedRef  = useRef(false);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

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
    return () => { el.removeEventListener("scroll", updateArrows); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games]);

  useEffect(() => {
    const id = setInterval(() => {
      if (hoveredRef.current || pausedRef.current) return;
      const el = scrollRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + SCROLL_AMOUNT, behavior: "smooth" });
    }, AUTO_DELAY);
    return () => clearInterval(id);
  }, []);

  function slide(dir: -1 | 1) {
    pausedRef.current = true;
    setTimeout(() => { pausedRef.current = false; }, 6000);
    scrollRef.current?.scrollBy({ left: dir * SCROLL_AMOUNT, behavior: "smooth" });
  }

  return (
    <div
      onMouseEnter={() => { hoveredRef.current = true; }}
      onMouseLeave={() => { hoveredRef.current = false; }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="font-bebas text-[20px] tracking-[0.07em] text-gx-text-1 flex items-center gap-[9px] m-0" style={{ fontSize: 17 }}>
          {icon}
          {title}
        </h3>
        {!isLoading && (
          <div className="flex gap-[5px]">
            <button
              className="w-7 h-7 rounded-[7px] bg-white/[0.04] border border-gl-border text-gl-muted cursor-pointer flex items-center justify-center transition-all disabled:opacity-[0.22] disabled:cursor-not-allowed hover:not-disabled:bg-gl-violet/[0.18] hover:not-disabled:border-gl-violet/35 hover:not-disabled:text-gl-text"
              onClick={() => slide(-1)}
              disabled={!canLeft}
              aria-label="Scroll left"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              className="w-7 h-7 rounded-[7px] bg-white/[0.04] border border-gl-border text-gl-muted cursor-pointer flex items-center justify-center transition-all disabled:opacity-[0.22] disabled:cursor-not-allowed hover:not-disabled:bg-gl-violet/[0.18] hover:not-disabled:border-gl-violet/35 hover:not-disabled:text-gl-text"
              onClick={() => slide(1)}
              disabled={!canRight}
              aria-label="Scroll right"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        {canLeft  && <div className="absolute top-0 bottom-1 left-0 w-10 pointer-events-none z-[2] bg-gradient-to-r from-gl-surface to-transparent" />}
        {canRight && <div className="absolute top-0 bottom-1 right-0 w-10 pointer-events-none z-[2] bg-gradient-to-l from-gl-surface to-transparent" />}
        <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isLoading
            ? Array.from({ length: 7 }).map((_, i) => <SkeletonTile key={i} />)
            : games.map((g) => <GameTile key={g.rawgId} game={g} upcoming={upcoming} />)}
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
    <div className="bg-gl-surface border border-gl-border rounded-[16px] px-5 py-5 pb-[18px]">
      <GameRow
        title="New Releases"
        icon={<Flame size={15} color="#fb923c" />}
        games={newReleases}
        isLoading={loadingNew}
      />
      <div className="h-px bg-gl-border my-[18px]" />
      <GameRow
        title="Coming Soon"
        icon={<CalendarDays size={15} color="#60a5fa" />}
        games={upcoming}
        upcoming
        isLoading={loadingUpcoming}
      />
    </div>
  );
}
