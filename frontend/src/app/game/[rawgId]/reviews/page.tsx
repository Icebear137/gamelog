"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { MessageSquare, ArrowLeft, Clock, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { Heading, Flex } from "@radix-ui/themes";
import { GameReview } from "@/lib/types";
import { getGameService, getGameReviewsService } from "@/services/game.service";
import { ReviewCard } from "@/components/ReviewCard";

type Sort = "recent" | "helpful";

interface GameBasic { name: string; rawgId: number }

export default function GameReviewsPage({ params }: { params: Promise<{ rawgId: string }> }) {
  const { rawgId } = use(params);
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("recent");

  const { data: game } = useQuery<GameBasic>({
    queryKey: ["game", rawgId],
    queryFn: () => getGameService(parseInt(rawgId)),
    staleTime: 5 * 60_000,
  });

  const queryKey = ["game-reviews", rawgId, sort];
  const { data: reviews = [], isLoading } = useQuery<GameReview[]>({
    queryKey,
    queryFn: () => getGameReviewsService(parseInt(rawgId), sort),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <Flex align="center" gap="3">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <Heading size="5" className="flex items-center gap-2">
            <MessageSquare size={20} className="text-violet-400" />
            Reviews
            {reviews.length > 0 && <span className="text-gray-500 font-normal text-base">({reviews.length})</span>}
          </Heading>
          {game && (
            <Link href={`/game/${rawgId}`} className="text-sm text-gray-400 hover:text-violet-400 transition-colors">
              {game.name}
            </Link>
          )}
        </div>

        {/* Sort tabs */}
        <div className="flex gap-1 shrink-0">
          {([
            { key: "recent",  label: "Recent",  icon: <Clock size={12} /> },
            { key: "helpful", label: "Helpful", icon: <ThumbsUp size={12} /> },
          ] as { key: Sort; label: string; icon: React.ReactNode }[]).map((o) => (
            <button
              key={o.key}
              onClick={() => setSort(o.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sort === o.key ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/8"
              }`}
            >
              {o.icon} {o.label}
            </button>
          ))}
        </div>
      </Flex>

      {isLoading && (
        <div className="py-8 text-center text-sm text-gray-500">Loading reviews…</div>
      )}

      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-20 bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30 text-gray-500" />
          <p className="text-sm text-gray-500 font-medium">No reviews yet</p>
          <p className="text-xs text-gray-600 mt-1">Be the first to review this game.</p>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} queryKey={queryKey} />
        ))}
      </div>
    </div>
  );
}
