"use client";

import { memo } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { Gamepad2, TrendingUp, Star } from "lucide-react";
import WantToPlayButton from "@/components/WantToPlayButton";

export interface TrendingGame {
  id: string;
  rawgId: number;
  name: string;
  coverImage?: string;
  rawgRating?: number;
  addedCount: number;
}

interface Props {
  game: TrendingGame;
  rank: number;
  showButton: boolean;
}

export default memo(function TrendingGameCard({ game, rank, showButton }: Props) {
  const router = useRouter();

  return (
    <div>
      <div
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-gx-border bg-gx-surface-2 [contain:layout_style] [transition:border-color_0.18s] hover:border-gx-amber/30"
        role="link"
        tabIndex={0}
        onClick={() => router.push(`/game/${game.rawgId}`)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`); }}
      >
        <div className="pointer-events-none absolute inset-0 z-[5] rounded-xl border border-gx-amber opacity-0 [transition:opacity_0.18s] group-hover:opacity-100" />

        {/* Rank badge */}
        <div
          className={clsx(
            "absolute top-2 left-2 z-[4] flex h-[22px] w-[22px] items-center justify-center rounded-md text-[11px] font-extrabold",
            rank === 1 ? "bg-gx-amber text-gx-ink" : "bg-black/75 text-gx-text-1"
          )}
        >
          {rank}
        </div>

        {/* Cover */}
        {game.coverImage ? (
          <img src={game.coverImage} alt={game.name} className="block aspect-[3/4] w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-gx-surface-2">
            <Gamepad2 size={28} color="var(--gx-text-3)" />
          </div>
        )}

        {/* Footer overlay */}
        <div className="absolute inset-x-0 bottom-0 z-[3] bg-[linear-gradient(to_top,rgba(0,0,0,0.88)_0%,transparent_100%)] px-2 pt-5 pb-2">
          <div className="flex items-center gap-1 text-[10px] text-gx-teal">
            <TrendingUp size={10} />
            <span>{game.addedCount} added</span>
          </div>
          {game.rawgRating && (
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gx-amber">
              <Star size={10} fill="currentColor" />
              <span>{game.rawgRating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      <p className="mt-[7px] truncate text-[11px] font-semibold text-gx-text-2 [transition:color_0.15s]">{game.name}</p>

      {showButton && (
        <div style={{ marginTop: 6 }}>
          <WantToPlayButton rawgId={game.rawgId} gameName={game.name} />
        </div>
      )}
    </div>
  );
});
