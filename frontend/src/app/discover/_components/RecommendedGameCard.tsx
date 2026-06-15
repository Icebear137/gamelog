"use client";

import { memo, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { Gamepad2, Sparkles, Star } from "lucide-react";
import { gx } from "@/lib/gx-styles";
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
    <div
      className={clsx(
        "group flex cursor-pointer items-center gap-3 rounded-xl border border-gx-border bg-gx-surface p-2.5 [transition:border-color_0.15s,opacity_0.3s,scale_0.3s] hover:border-gx-amber/30",
        dismissing && "pointer-events-none scale-95 opacity-0"
      )}
    >
      {/* Cover */}
      <div
        className="h-[68px] w-[52px] shrink-0 overflow-hidden rounded-[7px] bg-gx-surface-2"
        role="link"
        tabIndex={0}
        style={{ cursor: "pointer" }}
        onClick={() => router.push(`/game/${game.rawgId}`)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`); }}
      >
        {game.coverImage ? (
          <img src={game.coverImage} alt={game.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gamepad2 size={18} color="var(--gx-text-3)" />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          className="truncate text-[13px] font-bold text-gx-text-1 [transition:color_0.15s] group-hover:text-gx-amber"
          role="link"
          tabIndex={0}
          style={{ cursor: "pointer" }}
          onClick={() => router.push(`/game/${game.rawgId}`)}
        >
          {game.name}
        </p>
        {game.reason && (
          <p className="mt-[3px] flex items-center gap-1 text-[11px] text-gx-text-3">
            <Sparkles size={10} color="var(--gx-amber)" style={{ flexShrink: 0 }} />
            {game.reason}
          </p>
        )}
        <div className="mt-[5px] flex flex-wrap items-center gap-2">
          {game.rawgRating != null && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#F59E0B" }}>
              <Star size={10} fill="currentColor" />
              <span style={{ fontWeight: 700 }}>{game.rawgRating.toFixed(1)}</span>
            </span>
          )}
          {game.genres.slice(0, 2).map((g) => (
            <span key={g} className={gx.genrePill} style={{ fontSize: 10, padding: "2px 8px" }}>{g}</span>
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
