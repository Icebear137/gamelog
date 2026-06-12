"use client";

import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, Sparkles, Star } from "lucide-react";
import WantToPlayButton from "@/components/WantToPlayButton";

export interface RecommendedGame {
  id: string;
  rawgId: number;
  name: string;
  coverImage?: string;
  rawgRating?: number;
  releaseYear?: number;
  genres: string[];
  reason: string | null;
}

interface Props {
  game: RecommendedGame;
  onDismiss?: (rawgId: number) => void;
}

export default memo(function RecommendedGameCard({ game, onDismiss }: Props) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState(false);

  function handleAddSuccess() {
    setDismissing(true);
    setTimeout(() => onDismiss?.(game.rawgId), 350);
  }

  return (
    <div className={`gx-rec-card${dismissing ? " gx-rec-card-dismissing" : ""}`}>
      {/* Cover */}
      <div
        className="gx-rec-cover"
        role="link"
        tabIndex={0}
        style={{ cursor: "pointer" }}
        onClick={() => router.push(`/game/${game.rawgId}`)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`); }}
      >
        {game.coverImage ? (
          <img src={game.coverImage} alt={game.name} loading="lazy" decoding="async" />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gamepad2 size={18} color="var(--gx-text-3)" />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          className="gx-rec-name"
          role="link"
          tabIndex={0}
          style={{ cursor: "pointer" }}
          onClick={() => router.push(`/game/${game.rawgId}`)}
        >
          {game.name}
        </p>
        {game.reason && (
          <p className="gx-rec-reason">
            <Sparkles size={10} color="var(--gx-amber)" style={{ flexShrink: 0 }} />
            {game.reason}
          </p>
        )}
        <div className="gx-rec-meta">
          {game.rawgRating != null && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#F59E0B" }}>
              <Star size={10} fill="currentColor" />
              <span style={{ fontWeight: 700 }}>{game.rawgRating.toFixed(1)}</span>
            </span>
          )}
          {game.genres.slice(0, 2).map((g) => (
            <span key={g} className="gx-genre-pill" style={{ fontSize: 10, padding: "2px 8px" }}>{g}</span>
          ))}
        </div>
      </div>

      {/* Add button */}
      <div style={{ flexShrink: 0 }}>
        <WantToPlayButton rawgId={game.rawgId} gameName={game.name} onSuccess={handleAddSuccess} />
      </div>
    </div>
  );
});
