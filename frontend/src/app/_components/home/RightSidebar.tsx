"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Tag, Flame, CalendarDays, Gamepad2, Star, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { discoverUsersService } from "@/services/user.service";
import { getPopularTagsService, getRecommendationsService } from "@/services/game.service";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import GxGlobalPulse from "./GxGlobalPulse";
import { type RecommendedGame } from "@/app/discover/_components/RecommendedGameCard";
import WantToPlayButton from "@/components/WantToPlayButton";
import type { SuggestedUser } from "@/app/discover/_components/SuggestedUserCard";

const FIVE_MIN = 5 * 60_000;
const ONE_HOUR = 60 * 60_000;

interface GamePreview {
  rawgId: number;
  name: string;
  coverImage: string | null;
  released: string | null;
  rawgRating: number;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function SidebarRecCard({ game, onDismiss }: { game: RecommendedGame; onDismiss: (id: number) => void }) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState(false);

  function handleSuccess() {
    setDismissing(true);
    setTimeout(() => onDismiss(game.rawgId), 320);
  }

  return (
    <div
      className={`group flex items-center gap-2.25 px-2 py-1.75 rounded-[9px] border border-transparent cursor-pointer transition-[background,border-color,opacity,transform] duration-150 hover:bg-white/4 hover:border-gx-border${dismissing ? " opacity-0 scale-[0.96] pointer-events-none" : ""}`}
      onClick={() => router.push(`/game/${game.rawgId}`)}
    >
      {/* Cover */}
      <div className="shrink-0 w-9.5 h-12.5 rounded-md overflow-hidden bg-gx-surface-2 flex items-center justify-center">
        {game.coverImage ? (
          <img src={game.coverImage} alt={game.name} loading="lazy" className="w-full h-full object-cover block" />
        ) : (
          <Gamepad2 size={12} color="var(--gx-text-3)" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <p className="m-0 text-[12px] font-semibold text-gx-text-1 truncate leading-[1.3] transition-colors group-hover:text-gx-amber">{game.name}</p>
        {game.reason && (
          <p className="m-0 text-[10px] text-gx-text-3 flex items-center gap-0.75 truncate [&_svg]:shrink-0 [&_svg]:text-gx-amber">
            <Sparkles size={9} />
            {game.reason}
          </p>
        )}
        <div className="flex items-center gap-1.25 mt-px">
          {game.rawgRating != null && game.rawgRating > 0 && (
            <span className="flex items-center gap-0.75 text-[10px] font-semibold text-gl-amber">
              <Star size={9} fill="currentColor" />
              {game.rawgRating.toFixed(1)}
            </span>
          )}
          {game.genres[0] && (
            <span className="text-[9px] font-semibold text-gx-text-3 bg-white/6 px-1.5 py-px rounded-sm whitespace-nowrap">{game.genres[0]}</span>
          )}
        </div>
      </div>

      {/* Add button */}
      <div className="shrink-0 [&_span]:hidden [&_button]:p-1.25! [&_button]:rounded-[7px]! [&_button]:border! [&_button]:border-gx-border! [&_button]:bg-white/4! [&_button]:transition-[border-color,background]! [&_button:hover]:border-gx-amber! [&_button:hover]:bg-gx-amber/10! [&_button:hover]:text-gx-amber!" onClick={(e) => e.stopPropagation()}>
        <WantToPlayButton rawgId={game.rawgId} gameName={game.name} onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

function GameListRow({ game, showRating }: { game: GamePreview; showRating?: boolean }) {
  const router = useRouter();
  return (
    <div className="group flex items-center gap-2.25 px-1 py-1.25 rounded-lg cursor-pointer transition-colors hover:bg-gx-surface-2" onClick={() => router.push(`/game/${game.rawgId}`)}>
      {game.coverImage ? (
        <img src={game.coverImage} alt={game.name} className="w-7.5 h-10 rounded-sm object-cover shrink-0 border border-gx-border" />
      ) : (
        <div className="w-7.5 h-10 rounded-sm object-cover shrink-0 border border-gx-border bg-gx-surface-2 flex items-center justify-center text-gx-text-3">
          <Gamepad2 size={10} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-gx-text-1 truncate m-0 transition-colors group-hover:text-gx-amber">{game.name}</p>
        <p className="text-[10px] text-gx-text-3 m-0">
          {showRating && game.rawgRating > 0 ? (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Star size={9} fill="#F59E0B" color="#F59E0B" />
              {game.rawgRating.toFixed(1)}
            </span>
          ) : (
            formatDate(game.released)
          )}
        </p>
      </div>
    </div>
  );
}

function PersonRow({ su }: { su: SuggestedUser }) {
  const qc = useQueryClient();
  const followMutation = useMutation({
    mutationFn: () => api.post(`/api/users/${su.username}/follow`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover-people"] });
      dispatchToast(`Following ${su.username}`, "success");
    },
    onError: (err: any) =>
      dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  return (
    <div className="flex items-center gap-2 px-1 py-1.25 rounded-lg transition-colors hover:bg-gx-surface-2">
      {su.avatar ? (
        <img src={su.avatar} alt={su.username} className="w-7.5 h-7.5 rounded-full object-cover shrink-0 border border-gx-border" />
      ) : (
        <div className="w-7.5 h-7.5 rounded-full bg-gx-surface-2 flex items-center justify-center text-[11px] font-bold text-gx-text-2 shrink-0 border border-gx-border">
          {su.username.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <Link href={`/user/${su.username}`} className="text-[12px] font-semibold text-gx-text-1 no-underline truncate block transition-colors hover:text-gx-amber">
          {su.username}
        </Link>
        <p className="text-[10px] text-gx-text-3">{su.commonGames} games in common</p>
      </div>
      <button
        className="shrink-0 px-2.5 py-0.75 rounded-[20px] text-[10px] font-bold bg-gx-amber/13 text-gx-amber border border-gx-amber/25 cursor-pointer transition-all whitespace-nowrap hover:enabled:bg-gx-amber hover:enabled:text-black disabled:opacity-60 disabled:cursor-wait data-[following=true]:bg-transparent data-[following=true]:text-gx-text-2 data-[following=true]:border-gx-border"
        onClick={() => followMutation.mutate()}
        disabled={followMutation.isPending}
      >
        {followMutation.isPending ? "…" : "Follow"}
      </button>
    </div>
  );
}

export default function RightSidebar() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const handleDismiss = useCallback((rawgId: number) => {
    setDismissed((prev) => new Set([...prev, rawgId]));
  }, []);

  const { data: suggested = [] } = useQuery<SuggestedUser[]>({
    queryKey: ["discover-people"],
    queryFn: discoverUsersService,
    enabled: !!user,
    staleTime: FIVE_MIN,
  });

  const { data: popularTags = [] } = useQuery<{ tag: string; votes: number }[]>({
    queryKey: ["popular-tags"],
    queryFn: getPopularTagsService,
    staleTime: FIVE_MIN,
  });

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

  const { data: recs = [] } = useQuery<RecommendedGame[]>({
    queryKey: ["recommendations"],
    queryFn: getRecommendationsService,
    enabled: !!user,
    staleTime: FIVE_MIN,
  });

  const visibleRecs = recs.filter((g) => !dismissed.has(g.rawgId)).slice(0, 4);

  return (
    <>
      {/* 1. Live global pulse — top priority */}
      <GxGlobalPulse />

      {/* 2. Suggested people */}
      {user && suggested.length > 0 && (
        <>
          <div className="h-px bg-gx-border my-2.5" />
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gx-text-3 px-1 mb-0.5 flex items-center gap-1.25">
              <Users size={9} />
              People You Might Know
            </p>
            {suggested.slice(0, 4).map((su) => (
              <PersonRow key={su.id} su={su} />
            ))}
            <Link href="/discover" className="text-[11px] text-gx-text-3 px-1 no-underline transition-colors block hover:text-gx-amber">
              See more →
            </Link>
          </div>
        </>
      )}

      {/* 3. New Releases */}
      {(loadingNew || newReleases.length > 0) && (
        <>
          <div className="h-px bg-gx-border my-2.5" />
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gx-text-3 px-1 mb-0.5 flex items-center gap-1.25">
              <Flame size={9} color="#fb923c" />
              New Releases
            </p>
            {loadingNew ? (
              <p style={{ fontSize: 11, color: "var(--gx-text-3)", padding: "4px" }}>Loading…</p>
            ) : (
              newReleases.slice(0, 4).map((g) => (
                <GameListRow key={g.rawgId} game={g} showRating />
              ))
            )}
          </div>
        </>
      )}

      {/* 4. Coming Soon */}
      {(loadingUpcoming || upcoming.length > 0) && (
        <>
          <div className="h-px bg-gx-border my-2.5" />
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gx-text-3 px-1 mb-0.5 flex items-center gap-1.25">
              <CalendarDays size={9} color="#60a5fa" />
              Coming Soon
            </p>
            {loadingUpcoming ? (
              <p style={{ fontSize: 11, color: "var(--gx-text-3)", padding: "4px" }}>Loading…</p>
            ) : (
              upcoming.slice(0, 4).map((g) => (
                <GameListRow key={g.rawgId} game={g} />
              ))
            )}
          </div>
        </>
      )}

      {/* 5. Recommended games */}
      {user && visibleRecs.length > 0 && (
        <>
          <div className="h-px bg-gx-border my-2.5" />
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gx-text-3 px-1 mb-0.5 flex items-center gap-1.25">
              <Sparkles size={9} color="var(--gx-amber)" />
              Picked For You
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {visibleRecs.map((g) => (
                <SidebarRecCard key={g.rawgId} game={g} onDismiss={handleDismiss} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* 6. Popular tags */}
      {popularTags.length > 0 && (
        <>
          <div className="h-px bg-gx-border my-2.5" />
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gx-text-3 px-1 mb-0.5 flex items-center gap-1.25">
              <Tag size={9} />
              Popular Tags
            </p>
            <div className="flex flex-wrap gap-1">
              {popularTags.slice(0, 15).map(({ tag }) => (
                <Link key={tag} href={`/games/tag/${tag}`} className="px-2 py-0.75 rounded-[20px] text-[10px] font-semibold bg-gx-surface-2 border border-gx-border text-gx-text-2 no-underline transition-all hover:bg-gx-amber/13 hover:border-gx-amber/25 hover:text-gx-amber">
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
