"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import { Sparkles, Gamepad2, Star } from "lucide-react";
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
}

export default memo(function RecommendedGameCard({ game }: Props) {
  const router = useRouter();

  return (
    <div className="group flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-3 hover:border-violet-700 transition-colors">
      <Slot
        role="link"
        tabIndex={0}
        className="cursor-pointer outline-none shrink-0"
        onClick={() => router.push(`/game/${game.rawgId}`)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
        }}
      >
        <div>
          {game.coverImage ? (
            <img
              src={game.coverImage}
              alt={game.name}
              loading="lazy"
              decoding="async"
              className="w-14 h-[4.5rem] object-cover rounded-lg"
            />
          ) : (
            <div className="w-14 h-[4.5rem] bg-white/8 rounded-lg flex items-center justify-center">
              <Gamepad2 size={20} className="text-gray-600" />
            </div>
          )}
        </div>
      </Slot>

      <div className="flex-1 min-w-0">
        <Slot
          role="link"
          tabIndex={0}
          className="cursor-pointer outline-none"
          onClick={() => router.push(`/game/${game.rawgId}`)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
          }}
        >
          <p className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
            {game.name}
          </p>
        </Slot>

        {game.reason && (
          <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 truncate">
            <Sparkles size={10} className="text-violet-500 shrink-0" />
            {game.reason}
          </p>
        )}

        <div className="flex items-center gap-3 mt-1">
          {game.rawgRating != null && (
            <div className="flex items-center gap-1 text-yellow-400 text-xs">
              <Star size={11} fill="currentColor" />
              <span className="font-bold">{game.rawgRating.toFixed(1)}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {game.genres.slice(0, 2).map((g) => (
              <span key={g} className="text-xs text-gray-500 bg-white/8 px-1.5 py-0.5 rounded-full">
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0">
        <WantToPlayButton rawgId={game.rawgId} gameName={game.name} />
      </div>
    </div>
  );
});

