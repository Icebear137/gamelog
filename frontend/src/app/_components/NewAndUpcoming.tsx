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
      className="hm-game-tile"
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/game/${game.rawgId}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
      }}
    >
      <div className="hm-game-tile-img">
        {game.coverImage ? (
          <>
            <img src={game.coverImage} alt={game.name} loading="lazy" />
            <div className="hm-game-tile-shade" />
          </>
        ) : (
          <div className="hm-game-tile-empty">
            <Gamepad2 size={22} color="rgba(255,255,255,0.12)" />
          </div>
        )}
        {!upcoming && game.rawgRating > 0 && (
          <div className="hm-game-tile-rating">
            <Star size={9} fill="currentColor" />
            {game.rawgRating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="hm-game-tile-info">
        <p className="hm-game-tile-name">{game.name}</p>
        {game.released && (
          <p className="hm-game-tile-sub">{formatDate(game.released)}</p>
        )}
      </div>
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="hm-game-tile" style={{ pointerEvents: "none" }}>
      <div className="hm-skel-img" />
      <div className="hm-skel-line" />
      <div className="hm-skel-line-sm" />
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
      <div className="hm-strip-head">
        <h3 className="hm-section-label" style={{ fontSize: 17 }}>
          {icon}
          {title}
        </h3>
        {!isLoading && (
          <div className="hm-strip-arrows">
            <button
              className="hm-strip-arrow"
              onClick={() => slide(-1)}
              disabled={!canLeft}
              aria-label="Scroll left"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              className="hm-strip-arrow"
              onClick={() => slide(1)}
              disabled={!canRight}
              aria-label="Scroll right"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="hm-strip-scroll-wrap">
        {canLeft  && <div className="hm-strip-fade-l" />}
        {canRight && <div className="hm-strip-fade-r" />}
        <div ref={scrollRef} className="hm-strip-scroll">
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
    <div className="hm-strip-wrap">
      <GameRow
        title="New Releases"
        icon={<Flame size={15} color="#fb923c" />}
        games={newReleases}
        isLoading={loadingNew}
      />
      <div className="hm-strip-divider" />
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
