"use client";

import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Text } from "@radix-ui/themes";
import { ChatMessage } from "@/lib/types";

interface Props {
  game: NonNullable<ChatMessage["game"]>;
  caption: string;
  isOwn: boolean;
}

export function GameCard({ game, caption, isOwn }: Props) {
  const router = useRouter();
  return (
    <div
      className={`rounded-2xl overflow-hidden border max-w-55 cursor-pointer group/card ${isOwn ? "border-violet-500/30 bg-violet-900/20 rounded-br-sm" : "border-white/10 bg-white/5 rounded-bl-sm"}`}
      onClick={() => router.push(`/game/${game.rawgId}`)}
    >
      {game.coverImage ? (
        <div className="relative h-28 w-full overflow-hidden">
          <Image src={game.coverImage} alt={game.name} fill className="object-cover group-hover/card:brightness-90 transition-all duration-200" sizes="220px" />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
        </div>
      ) : (
        <div className="h-20 bg-white/5 flex items-center justify-center">
          <Gamepad2 size={28} className="text-gray-600" />
        </div>
      )}
      <div className="px-3 py-2.5">
        <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide mb-1">🎮 Game</p>
        <Text as="p" size="2" weight="bold" className="leading-tight line-clamp-2">{game.name}</Text>
        {game.releaseYear && <Text as="p" size="1" color="gray" className="mt-0.5">{game.releaseYear}</Text>}
        {caption && caption !== "[deleted]" && (
          <Text as="p" size="1" color="gray" className="mt-1.5 leading-relaxed wrap-anywhere">{caption}</Text>
        )}
        <Text as="p" size="1" weight="medium" className={`mt-2 transition-colors ${isOwn ? "text-violet-300 group-hover/card:text-violet-200" : "text-violet-400 group-hover/card:text-violet-300"}`}>
          View game →
        </Text>
      </div>
    </div>
  );
}
