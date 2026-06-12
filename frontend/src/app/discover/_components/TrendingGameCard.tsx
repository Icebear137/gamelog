"use client";

import { memo } from "react";
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
        className="gx-trending-card"
        role="link"
        tabIndex={0}
        onClick={() => router.push(`/game/${game.rawgId}`)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`); }}
      >
        <div className="gx-trending-ring" />

        {/* Rank badge */}
        <div className={`gx-trending-rank ${rank === 1 ? "gx-trending-rank-gold" : ""}`}>
          {rank}
        </div>

        {/* Cover */}
        {game.coverImage ? (
          <img src={game.coverImage} alt={game.name} className="gx-trending-img" loading="lazy" decoding="async" />
        ) : (
          <div className="gx-trending-empty">
            <Gamepad2 size={28} color="var(--gx-text-3)" />
          </div>
        )}

        {/* Footer overlay */}
        <div className="gx-trending-foot">
          <div className="gx-trending-stat">
            <TrendingUp size={10} />
            <span>{game.addedCount} added</span>
          </div>
          {game.rawgRating && (
            <div className="gx-trending-rating">
              <Star size={10} fill="currentColor" />
              <span>{game.rawgRating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      <p className="gx-trending-name">{game.name}</p>

      {showButton && (
        <div style={{ marginTop: 6 }}>
          <WantToPlayButton rawgId={game.rawgId} gameName={game.name} />
        </div>
      )}
    </div>
  );
});
