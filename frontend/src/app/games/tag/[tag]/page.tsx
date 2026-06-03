"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Tag, ArrowLeft, Gamepad2, Star } from "lucide-react";
import Link from "next/link";
import { Heading, Text, Flex } from "@radix-ui/themes";
import { getGamesByTagService } from "@/services/game.service";

interface TagGame {
  rawgId: number;
  name: string;
  coverImage?: string | null;
  releaseYear?: number | null;
  rawgRating?: number | null;
  genres: string[];
  tagVotes: number;
}

export default function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = use(params);
  const router = useRouter();
  const decoded = decodeURIComponent(tag);

  const { data: games = [], isLoading } = useQuery<TagGame[]>({
    queryKey: ["games-by-tag", decoded],
    queryFn: () => getGamesByTagService(decoded),
    staleTime: 2 * 60_000,
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <Flex align="center" gap="3">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <Heading size="5" className="flex items-center gap-2">
            <Tag size={20} className="text-violet-400" />
            {decoded}
          </Heading>
          {!isLoading && (
            <Text as="p" size="1" color="gray" className="mt-0.5">
              {games.length} game{games.length !== 1 ? "s" : ""} tagged
            </Text>
          )}
        </div>
      </Flex>

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-3/4 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && games.length === 0 && (
        <div className="text-center py-20 bg-white/5 border border-white/8 rounded-2xl">
          <Gamepad2 size={40} className="mx-auto mb-3 opacity-30 text-gray-500" />
          <Text as="p" size="2" color="gray">No games tagged "{decoded}" yet.</Text>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {games.map((g) => (
          <Link
            key={g.rawgId}
            href={`/game/${g.rawgId}`}
            className="group flex flex-col bg-white/5 hover:bg-white/8 border border-white/8 hover:border-violet-500/40 rounded-xl overflow-hidden transition-colors"
          >
            {/* Cover */}
            <div className="aspect-3/4 bg-white/5 overflow-hidden relative">
              {g.coverImage ? (
                <img
                  src={g.coverImage}
                  alt={g.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gamepad2 size={28} className="text-gray-700" />
                </div>
              )}
              {/* Tag votes badge */}
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
                <Tag size={9} className="text-violet-400" />
                <span className="text-[10px] text-violet-300 font-medium">{g.tagVotes}</span>
              </div>
            </div>
            {/* Info */}
            <div className="p-2.5">
              <p className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors truncate leading-tight">
                {g.name}
              </p>
              <Flex align="center" gap="2" className="mt-1">
                {g.releaseYear && (
                  <Text as="span" size="1" color="gray">{g.releaseYear}</Text>
                )}
                {g.rawgRating != null && (
                  <span className="flex items-center gap-0.5 text-[11px] text-yellow-400">
                    <Star size={10} fill="currentColor" />
                    {g.rawgRating.toFixed(1)}
                  </span>
                )}
              </Flex>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
