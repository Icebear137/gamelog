"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import { Text } from "@radix-ui/themes";
import { TrendingUp, Gamepad2, Star } from "lucide-react";
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
    <div className="group relative">
      {/*
        Slot merges navigation props onto the child div without adding
        a DOM node. No Next.js Link = no prefetch requests on hover.
      */}
      <Slot
        role="link"
        tabIndex={0}
        className="cursor-pointer outline-none block"
        onClick={() => router.push(`/game/${game.rawgId}`)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") router.push(`/game/${game.rawgId}`);
        }}
      >
        <div>
          <div className="relative rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/8">
            {/* Hover ring — opacity transition is GPU-accelerated (no repaint) */}
            <div className="absolute inset-0 rounded-xl border border-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-20" />

            <div className="absolute top-2 left-2 z-10 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {rank}
            </div>

            {game.coverImage ? (
              <img
                src={game.coverImage}
                alt={game.name}
                loading="lazy"
                decoding="async"
                className="w-full aspect-3/4 object-cover"
              />
            ) : (
              <div className="w-full aspect-3/4 bg-white/8 flex items-center justify-center">
                <Gamepad2 size={32} className="text-gray-600" />
              </div>
            )}

            <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/80 to-transparent p-2 z-10">
              <div className="flex items-center gap-1 text-violet-300 text-xs">
                <TrendingUp size={11} />
                <span>{game.addedCount} added</span>
              </div>
              {game.rawgRating && (
                <div className="flex items-center gap-1 text-yellow-400 text-xs mt-0.5">
                  <Star size={11} fill="currentColor" />
                  <span>{game.rawgRating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          <Text as="p" size="1" color="gray" className="mt-1.5 font-medium truncate group-hover:text-white">
            {game.name}
          </Text>
        </div>
      </Slot>

      {showButton && (
        <div className="mt-1">
          <WantToPlayButton rawgId={game.rawgId} gameName={game.name} />
        </div>
      )}
    </div>
  );
});

